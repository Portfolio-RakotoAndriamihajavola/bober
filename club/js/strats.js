// Page des strats : une map à la fois, filtres attaque, défense, site et recherche,
// fiches repliables (signaux, agents, vignettes, puis étapes en grand), ajout et modification.
// Adresse : strats.html#lotus ouvre une map, strats.html#lotus-hit-a ouvre une strat.
(function () {
  var Club = window.Club;
  var el = Club.el;

  var etat = { map: '', cote: '', site: '', recherche: '' };
  var ouvertes = {};
  var CLE_MAP = 'boberClubDerniereMap';

  // --- Adresse et map de départ -----------------------------------------------

  function lireAdresse() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (Club.map(h)) return { map: h, strat: '' };
    var s = Club.strats().filter(function (x) { return x.id === h; })[0];
    if (s) return { map: s.map, strat: s.id };
    return { map: '', strat: '', inconnue: h };
  }
  // Lien vers une strat pas encore reçue (les données de la team arrivent juste après) :
  // on ouvre déjà sa map, lue dans le début de l'id, et on y va dès qu'elle arrive.
  var lienEnAttente = '';
  function mapDeDepart() {
    var a = lireAdresse();
    if (a.map) return a;
    if (a.inconnue) {
      lienEnAttente = a.inconnue;
      var prefixe = Club.MAPS.filter(function (m) { return a.inconnue.indexOf(m.id + '-') === 0; })[0];
      if (prefixe) return { map: prefixe.id, strat: '' };
    }
    var derniere = '';
    try { derniere = sessionStorage.getItem(CLE_MAP) || ''; } catch (e) { derniere = ''; }
    if (Club.map(derniere)) return { map: derniere, strat: '' };
    var m = Club.matchsAVenir()[0];
    var mp = m ? Club.mapDepuis(m.map) : null;
    return { map: mp ? mp.id : 'lotus', strat: '' };
  }

  // --- Recherche --------------------------------------------------------------

  function normaliser(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function texteDe(s) {
    var auteur = Club.personne(s.auteur);
    return normaliser([s.titre, s.site, s.cote === 'attaque' ? 'attaque' : 'defense', (s.quand || []).join(' '),
      (s.agents || []).join(' '), s.notes, (s.etapes || []).map(function (e) { return e.texte; }).join(' '),
      auteur ? auteur.nom : ''].join(' '));
  }
  function visibles(strats) {
    var mots = normaliser(etat.recherche).split(/\s+/).filter(Boolean);
    return strats.filter(function (s) {
      if (etat.cote && s.cote !== etat.cote) return false;
      if (etat.site && s.site !== etat.site) return false;
      if (!mots.length) return true;
      var t = texteDe(s);
      return mots.every(function (m) { return t.indexOf(m) >= 0; });
    });
  }

  // --- En-tête, choix de la map, filtres ----------------------------------------

  function rendreEntete(map, strats) {
    var att = strats.filter(function (s) { return s.cote === 'attaque'; }).length;
    document.querySelector('[data-map-image]').src = '../' + map.image;
    document.querySelector('[data-map-nom]').textContent = map.nom;
    document.querySelector('[data-map-surtitre]').textContent = 'Strats · ' + map.sites.length + ' sites';
    document.querySelector('[data-map-meta]').textContent = strats.length
      ? Club.pluriel(strats.length, 'strat', 'strats') + ' · ' + att + ' en attaque · ' + (strats.length - att) + ' en défense'
      : 'Aucune strat pour l\'instant';
    var guide = document.querySelector('[data-map-guide]');
    guide.hidden = !map.guide;
    if (map.guide) guide.href = '../' + encodeURI(map.guide);
    document.title = 'Strats ' + map.nom + ' · BOBER #WIPR';
  }

  function rendreChoixMaps() {
    var liste = document.querySelector('[data-maps-choix]');
    Club.vider(liste);
    Club.MAPS.forEach(function (map) {
      var n = Club.stratsDe(map.id).length;
      var ici = map.id === etat.map;
      liste.appendChild(el('li', {}, [
        el('a', { href: '#' + map.id, 'data-map': map.id, 'aria-current': ici ? 'true' : false, 'class': n ? '' : 'vide' }, [
          el('img', { src: '../' + map.image, alt: '', loading: 'lazy' }, []),
          el('span', { 'class': 'nom' }, [map.nom]),
          el('span', { 'class': 'compte', 'aria-label': Club.pluriel(n, 'strat', 'strats') }, [String(n)])
        ])
      ]));
    });
    var courant = liste.querySelector('[aria-current="true"]');
    // Centre la map choisie dans la rangée, sans faire défiler la page.
    if (courant) {
      var rang = liste.parentElement;
      var c = courant.getBoundingClientRect(), l = rang.getBoundingClientRect();
      rang.scrollLeft += (c.left + c.width / 2) - (l.left + l.width / 2);
    }
  }

  function zonesDe(map) { return map.sites.concat(Club.ZONES_EN_PLUS); }

  function rendreFiltres(map, strats) {
    var zone = document.querySelector('[data-sites-filtre]');
    var presentes = zonesDe(map).filter(function (z) {
      return map.sites.indexOf(z) >= 0 || strats.some(function (s) { return s.site === z; });
    });
    if (etat.site && presentes.indexOf(etat.site) < 0) etat.site = '';
    Club.vider(zone);
    [''].concat(presentes).forEach(function (z) {
      var b = el('button', { type: 'button', role: 'radio', 'aria-checked': etat.site === z ? 'true' : 'false', 'data-site': z }, [z || 'Tous les sites']);
      zone.appendChild(b);
    });
    document.querySelectorAll('[data-cote]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-cote') === etat.cote ? 'true' : 'false');
    });
  }

  // --- Plan à gauche ----------------------------------------------------------

  function rendrePlan(liste) {
    var zone = document.querySelector('[data-plan]');
    Club.vider(zone);
    [['attaque', 'Attaque'], ['defense', 'Défense']].forEach(function (c) {
      var du = liste.filter(function (s) { return s.cote === c[0]; });
      if (!du.length) return;
      zone.appendChild(el('p', { 'class': 'etiquette sep' }, [c[1]]));
      zone.appendChild(el('ul', { 'class': 'plan' }, du.map(function (s) {
        return el('li', {}, [el('a', { href: '#' + s.id, 'data-vers': s.id }, [
          el('span', { 'class': 'dot site ' + s.cote, 'aria-hidden': 'true' }, [s.site.charAt(0)]),
          el('span', {}, [s.titre])
        ])]);
      })));
    });
  }

  // --- Fiche d'une strat ------------------------------------------------------

  function lienSur(url) {
    try {
      var u = new URL(String(url || ''));
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch (e) { return ''; }
  }

  function lignesNotes(notes) {
    return String(notes || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m = l.match(/^([^:]{2,24})\s*:\s*(.+)$/);
      return el('p', {}, m ? [el('strong', {}, [m[1] + ' : ']), m[2]] : [l]);
    });
  }

  function legendeEtape(s, i) {
    var e = s.etapes[i];
    return 'Étape ' + (i + 1) + '. ' + (e.texte || '');
  }

  function fiche(s) {
    var ouverte = !!ouvertes[s.id];
    var cote = s.cote === 'attaque' ? 'Attaque' : 'Défense';
    var auteur = Club.personne(s.auteur);
    var modif = Club.personne(s.modifiePar);
    var etapes = s.etapes || [];
    var avecImage = etapes.map(function (e, i) { return { e: e, i: i }; }).filter(function (x) { return x.e.image; });

    var bascule = el('button', { type: 'button', 'class': 'strat-bascule', 'aria-expanded': ouverte ? 'true' : 'false', 'aria-controls': 'detail-' + s.id }, [
      el('span', {}, [s.titre]), el('span', { 'class': 'chevron', 'aria-hidden': 'true' }, [])
    ]);

    var detail = el('div', { 'class': 'strat-detail', id: 'detail-' + s.id, hidden: !ouverte }, [
      etapes.length ? el('ol', { 'class': 'etapes' }, etapes.map(function (e, i) {
        return el('li', {}, [el('figure', {}, [
          e.image ? el('img', { src: e.image, alt: legendeEtape(s, i), 'data-agrandir': true, 'data-legende': legendeEtape(s, i), tabindex: '0', role: 'button', loading: 'lazy' }, []) : null,
          el('figcaption', {}, [el('strong', {}, ['Étape ' + (i + 1) + '. ']), e.texte || ''])
        ])]);
      })) : el('p', { 'class': 'small' }, ['Pas encore d\'étape : modifie la strat pour en ajouter.']),
      s.notes ? el('div', { 'class': 'notes' }, [el('p', { 'class': 'etiquette' }, ['Rôle de chacun'])].concat(lignesNotes(s.notes))) : null,
      lienSur(s.video) ? el('p', {}, [el('a', { href: lienSur(s.video), target: '_blank', rel: 'noopener noreferrer', 'class': 'lien-video' }, ['Voir la vidéo'])]) : null
    ]);

    var copier = el('button', { type: 'button', 'class': 'bouton-texte' }, ['Copier le lien']);
    var modifier = el('button', { type: 'button', 'class': 'bouton-texte' }, ['Modifier']);
    var supprimer = el('button', { type: 'button', 'class': 'bouton-texte bouton-texte-danger' }, ['Supprimer']);
    copier.addEventListener('click', function () { Club.copier(location.href.split('#')[0] + '#' + s.id); });
    modifier.addEventListener('click', function () { ouvrirFormulaire(s); });
    supprimer.addEventListener('click', function () {
      Club.confirmer(supprimer, 'Supprimer « ' + s.titre + ' » pour toute la team ?', function () {
        var id = s.id, maj = new Date().toISOString(), par = Club.joueur();
        Club.modifier(Club.CLES.strats, function (v) { v[id] = { id: id, supprime: true, maj: maj, par: par }; });
        Club.annonce('Strat supprimée.');
      });
    });

    var art = el('article', { 'class': 'strat' + (ouverte ? ' ouverte' : ''), id: s.id, 'data-cote': s.cote }, [
      el('header', { 'class': 'strat-tete' }, [
        el('div', { 'class': 'strat-etiquettes' }, [
          el('span', { 'class': 'pastille-cote ' + s.cote }, [cote]),
          el('span', { 'class': 'pastille-site' }, [s.site]),
          s.auteur === 'playbook' ? el('span', { 'class': 'pastille-source' }, ['Playbook']) : null
        ]),
        el('h2', {}, [bascule])
      ]),
      el('div', { 'class': 'strat-resume' }, [
        (s.quand || []).length ? el('ul', { 'class': 'signaux' }, s.quand.map(function (q) { return el('li', {}, [q]); })) : null,
        (s.agents || []).length ? el('ul', { 'class': 'agents' }, s.agents.map(Club.puceAgent)) : null,
        avecImage.length ? el('ul', { 'class': 'vignettes', 'aria-label': 'Images des étapes' }, avecImage.map(function (x) {
          return el('li', {}, [
            el('img', { src: x.e.image, alt: legendeEtape(s, x.i), 'data-agrandir': true, 'data-legende': legendeEtape(s, x.i), tabindex: '0', role: 'button', loading: 'lazy' }, []),
            el('span', { 'aria-hidden': 'true' }, [String(x.i + 1)])
          ]);
        })) : null
      ]),
      detail,
      el('footer', { 'class': 'strat-pied' }, [
        el('span', { 'class': 'small' }, [
          (s.auteur === 'playbook' ? 'Playbook de la team' : 'Ajoutée par ' + (auteur ? auteur.nom : 'un joueur')) +
          ' · ' + Club.dateLongue(s.maj) + (modif ? ' · modifiée par ' + modif.nom : '')
        ]),
        el('span', { 'class': 'actions' }, [copier, modifier, supprimer])
      ])
    ]);

    bascule.addEventListener('click', function () { basculer(art, !ouvertes[s.id]); });
    return art;
  }

  function basculer(art, ouvrir) {
    var id = art.id;
    if (ouvrir) ouvertes[id] = true; else delete ouvertes[id];
    art.classList.toggle('ouverte', ouvrir);
    art.querySelector('.strat-bascule').setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
    var detail = art.querySelector('.strat-detail');
    detail.hidden = !ouvrir;
    if (ouvrir && detail.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      detail.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    }
  }

  function vide(map, toutes) {
    var b = el('button', { type: 'button', 'class': 'cta' }, ['Ajouter une strat sur ' + map.nom]);
    b.addEventListener('click', function () { ouvrirFormulaire(null); });
    return el('div', { 'class': 'vide-strats' }, toutes.length
      ? [el('p', {}, ['Aucune strat ne correspond à ces filtres.']), el('p', { 'class': 'small' }, ['Essaie « Tout » ou un autre site.'])]
      : [el('p', {}, ['Pas encore de strat sur ' + map.nom + '.']),
        el('p', { 'class': 'small' }, ['Ajoute la première : titre, quand la jouer, agents, puis les étapes avec une capture chacune.']), b]);
  }

  // --- Rendu de la page -------------------------------------------------------

  var observateur = null;
  function rendre() {
    var map = Club.map(etat.map);
    var toutes = Club.stratsDe(map.id);
    rendreEntete(map, toutes);
    rendreChoixMaps();
    rendreFiltres(map, toutes);
    var liste = visibles(toutes);
    rendrePlan(liste);
    var zone = document.querySelector('[data-liste-strats]');
    Club.vider(zone);
    if (!liste.length) zone.appendChild(vide(map, toutes));
    liste.forEach(function (s) { zone.appendChild(fiche(s)); });
    try { sessionStorage.setItem(CLE_MAP, map.id); } catch (e) { /* stockage bloqué */ }
    suivrePlan();
  }

  // Plan : la strat à l'écran est surlignée.
  function suivrePlan() {
    if (observateur) observateur.disconnect();
    if (!('IntersectionObserver' in window)) return;
    observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        document.querySelectorAll('[data-vers]').forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('data-vers') === e.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    document.querySelectorAll('.strat').forEach(function (a) { observateur.observe(a); });
  }

  function allerA(id, doux) {
    var art = document.getElementById(id);
    if (!art) return;
    basculer(art, true);
    art.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' });
    var b = art.querySelector('.strat-bascule');
    if (b) b.focus({ preventScroll: true });
  }

  // Changer de map : la page tourne comme un cube, vers la droite si la map est plus loin dans l'ordre.
  function changerMap(id, ajouterHistorique) {
    if (id === etat.map) return;
    var avant = Club.MAPS.indexOf(Club.map(etat.map)), apres = Club.MAPS.indexOf(Club.map(id));
    window.cubeSurPlace(apres > avant ? 'droite' : 'gauche', function () {
      if (ajouterHistorique) history.pushState(null, '', '#' + id);
      etat.map = id;
      etat.site = '';
      rendre();
      window.scrollTo(0, 0);
    });
  }

  // --- Formulaire -------------------------------------------------------------

  var dialogue = document.querySelector('[data-dialogue-strat]');
  var formulaire = document.querySelector('[data-formulaire]');
  var enEdition = null;
  var etapesSaisie = [];

  function remplirSites(mapId, choisi) {
    var select = formulaire.querySelector('[data-champ-site]');
    Club.vider(select);
    zonesDe(Club.map(mapId)).forEach(function (z) {
      select.appendChild(el('option', { value: z, selected: z === choisi }, [z === 'Global' ? 'Global (toute la map)' : z]));
    });
  }

  function construireChoixAgents(choisis) {
    var zone = formulaire.querySelector('[data-choix-agents]');
    Club.vider(zone);
    ['smoke', 'init', 'duel', 'sent'].forEach(function (role) {
      var groupe = el('div', { 'class': 'groupe-agents' }, [el('span', { 'class': 'etiquette' }, [Club.ROLES[role]])]);
      Club.AGENTS.filter(function (a) { return a.role === role; }).forEach(function (a) {
        var b = el('button', { type: 'button', 'class': 'agent-choix ' + role, 'aria-pressed': choisis.indexOf(a.nom) >= 0 ? 'true' : 'false', 'data-agent': a.nom }, [
          a.icone ? el('img', { src: a.icone, alt: '', width: '22', height: '22', loading: 'lazy' }, []) : null, a.nom
        ]);
        b.addEventListener('click', function () {
          b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        });
        groupe.appendChild(b);
      });
      zone.appendChild(groupe);
    });
  }

  // Réduit une capture avant de la stocker : 900 px au plus, en JPEG, environ 150 ko au plus.
  // Toutes les strats partagent une seule entrée sur le serveur, d'où la limite.
  function compresser(fichier) {
    return new Promise(function (ok, ko) {
      var lecteur = new FileReader();
      lecteur.onerror = function () { ko(new Error('Lecture du fichier impossible.')); };
      lecteur.onload = function () {
        var image = new Image();
        image.onerror = function () { ko(new Error('Ce fichier n\'est pas une image lisible.')); };
        image.onload = function () {
          var max = 900;
          var r = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
          var toile = document.createElement('canvas');
          toile.width = Math.round(image.naturalWidth * r);
          toile.height = Math.round(image.naturalHeight * r);
          var ctx = toile.getContext('2d');
          ctx.fillStyle = '#0b0f14';
          ctx.fillRect(0, 0, toile.width, toile.height);
          ctx.drawImage(image, 0, 0, toile.width, toile.height);
          var qualite = 0.72, url = toile.toDataURL('image/jpeg', qualite);
          while (url.length > 200000 && qualite > 0.35) {
            qualite -= 0.1;
            url = toile.toDataURL('image/jpeg', qualite);
          }
          ok(url);
        };
        image.src = lecteur.result;
      };
      lecteur.readAsDataURL(fichier);
    });
  }

  function rendreEtapesSaisie() {
    var liste = formulaire.querySelector('[data-etapes-saisie]');
    Club.vider(liste);
    etapesSaisie.forEach(function (e, i) {
      var texte = el('textarea', { rows: '2', 'aria-label': 'Texte de l\'étape ' + (i + 1), placeholder: 'Smoke de l\'Omen, flash de la Skye…' }, []);
      texte.value = e.texte || '';
      texte.addEventListener('input', function () { e.texte = texte.value; });

      var fichier = el('input', { type: 'file', accept: 'image/*', 'class': 'hors-ecran', id: 'image-etape-' + i }, []);
      var choisir = el('label', { 'class': 'bouton-contour', 'for': 'image-etape-' + i }, [e.image ? 'Changer l\'image' : 'Ajouter une capture']);
      var lien = el('input', { type: 'url', placeholder: 'ou colle un lien d\'image', 'aria-label': 'Lien de l\'image de l\'étape ' + (i + 1) }, []);
      if (e.image && !/^data:/.test(e.image)) lien.value = e.image;
      fichier.addEventListener('change', function () {
        var f = fichier.files && fichier.files[0];
        if (!f) return;
        choisir.textContent = 'Réduction…';
        compresser(f).then(function (url) { e.image = url; rendreEtapesSaisie(); }, function (err) {
          choisir.textContent = 'Ajouter une capture';
          montrerErreur(err.message);
        });
      });
      lien.addEventListener('change', function () {
        var u = lienSur(lien.value);
        if (lien.value && !u) { montrerErreur('Le lien de l\'image doit commencer par https://'); return; }
        e.image = u;
        rendreEtapesSaisie();
      });

      var outils = el('div', { 'class': 'outils-etape' }, [choisir, fichier, lien]);
      if (e.image) {
        var retirer = el('button', { type: 'button', 'class': 'bouton-texte' }, ['Retirer l\'image']);
        retirer.addEventListener('click', function () { e.image = ''; rendreEtapesSaisie(); });
        outils.appendChild(retirer);
      }
      var monter = el('button', { type: 'button', 'class': 'bouton-icone', 'aria-label': 'Monter l\'étape ' + (i + 1), disabled: i === 0 }, ['↑']);
      var descendre = el('button', { type: 'button', 'class': 'bouton-icone', 'aria-label': 'Descendre l\'étape ' + (i + 1), disabled: i === etapesSaisie.length - 1 }, ['↓']);
      var enlever = el('button', { type: 'button', 'class': 'bouton-icone', 'aria-label': 'Supprimer l\'étape ' + (i + 1) }, ['×']);
      monter.addEventListener('click', function () { etapesSaisie.splice(i - 1, 0, etapesSaisie.splice(i, 1)[0]); rendreEtapesSaisie(); });
      descendre.addEventListener('click', function () { etapesSaisie.splice(i + 1, 0, etapesSaisie.splice(i, 1)[0]); rendreEtapesSaisie(); });
      enlever.addEventListener('click', function () { etapesSaisie.splice(i, 1); rendreEtapesSaisie(); });

      liste.appendChild(el('li', {}, [
        el('div', { 'class': 'etape-tete' }, [el('strong', {}, ['Étape ' + (i + 1)]), el('span', { 'class': 'ordre' }, [monter, descendre, enlever])]),
        el('div', { 'class': 'etape-corps' }, [
          e.image ? el('img', { 'class': 'apercu', src: e.image, alt: '' }, []) : null,
          el('div', { 'class': 'etape-champs' }, [texte, outils])
        ])
      ]));
    });
  }

  function montrerErreur(t) { formulaire.querySelector('[data-erreur]').textContent = t || ''; }

  function ouvrirFormulaire(s) {
    if (typeof dialogue.showModal !== 'function') return;
    enEdition = s;
    formulaire.reset();
    montrerErreur('');
    document.querySelector('[data-titre-formulaire]').textContent = s ? 'Modifier la strat' : 'Ajouter une strat';
    var selectMap = formulaire.querySelector('[data-champ-map]');
    Club.vider(selectMap);
    Club.MAPS.forEach(function (m) { selectMap.appendChild(el('option', { value: m.id }, [m.nom])); });
    selectMap.value = s ? s.map : etat.map;
    remplirSites(selectMap.value, s ? s.site : (etat.site || Club.map(selectMap.value).sites[0]));
    formulaire.elements.titre.value = s ? s.titre : '';
    var cote = s ? s.cote : (etat.cote || 'attaque');
    formulaire.querySelectorAll('input[name="cote"]').forEach(function (r) { r.checked = r.value === cote; });
    formulaire.elements.quand.value = s ? (s.quand || []).join('\n') : '';
    formulaire.elements.notes.value = s ? s.notes || '' : '';
    formulaire.elements.video.value = s ? s.video || '' : '';
    construireChoixAgents(s ? s.agents || [] : []);
    etapesSaisie = s ? (s.etapes || []).map(function (e) { return { texte: e.texte || '', image: e.image || '' }; }) : [{ texte: '', image: '' }];
    rendreEtapesSaisie();
    dialogue.showModal();
    formulaire.elements.titre.focus();
  }

  formulaire.querySelector('[data-champ-map]').addEventListener('change', function (e) {
    remplirSites(e.target.value, Club.map(e.target.value).sites[0]);
  });
  formulaire.querySelector('[data-ajouter-etape]').addEventListener('click', function () {
    etapesSaisie.push({ texte: '', image: '' });
    rendreEtapesSaisie();
    var zones = formulaire.querySelectorAll('[data-etapes-saisie] textarea');
    if (zones.length) zones[zones.length - 1].focus();
  });
  formulaire.querySelector('[data-annuler]').addEventListener('click', function () { dialogue.close(); });

  function slug(t) {
    return normaliser(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'strat';
  }

  formulaire.addEventListener('submit', function (e) {
    e.preventDefault();
    var titre = formulaire.elements.titre.value.trim();
    if (!titre) { montrerErreur('Donne un titre à la strat.'); formulaire.elements.titre.focus(); return; }
    var video = formulaire.elements.video.value.trim();
    if (video && !lienSur(video)) { montrerErreur('Le lien vidéo doit commencer par https://'); return; }
    var moi = Club.joueur();
    if (!moi) {
      Club.demanderJoueur('Choisis ton pseudo pour signer la strat, puis enregistre-la.');
      return;
    }
    var map = formulaire.elements.map.value;
    var strat = {
      id: enEdition ? enEdition.id : map + '-' + slug(titre) + '-' + Math.random().toString(36).slice(2, 6),
      map: map,
      cote: formulaire.querySelector('input[name="cote"]:checked').value,
      site: formulaire.elements.site.value,
      titre: titre,
      quand: formulaire.elements.quand.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean),
      agents: Array.prototype.map.call(formulaire.querySelectorAll('[data-agent][aria-pressed="true"]'), function (b) { return b.getAttribute('data-agent'); }),
      etapes: etapesSaisie.filter(function (x) { return (x.texte || '').trim() || x.image; }).map(function (x) { return { texte: (x.texte || '').trim(), image: x.image || '' }; }),
      notes: formulaire.elements.notes.value.trim(),
      video: lienSur(video),
      auteur: enEdition ? enEdition.auteur : moi,
      modifiePar: enEdition ? moi : '',
      maj: new Date().toISOString()
    };
    var apres = Object.assign({}, Club.lire(Club.CLES.strats));
    apres[strat.id] = strat;
    if (Club.taille(apres) > Club.TAILLE_MAX) {
      montrerErreur('Trop d\'images enregistrées dans les strats de la team. Pour celle-ci, colle un lien d\'image (Imgur, Google Drive…) à la place du fichier.');
      return;
    }
    Club.modifier(Club.CLES.strats, function (v) { v[strat.id] = strat; });
    dialogue.close();
    ouvertes[strat.id] = true;
    Club.annonce(enEdition ? 'Strat modifiée.' : 'Strat ajoutée sur ' + Club.map(map).nom + '.');
    if (map !== etat.map) {
      history.pushState(null, '', '#' + strat.id);
      etat.map = map;
    }
    etat.cote = '';
    etat.site = '';
    etat.recherche = '';
    document.querySelector('[data-recherche]').value = '';
    rendre();
    allerA(strat.id, true);
  });

  // --- Événements -------------------------------------------------------------

  document.querySelector('[data-maps-choix]').addEventListener('click', function (e) {
    var a = e.target.closest('[data-map]');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    changerMap(a.getAttribute('data-map'), true);
  });
  document.querySelector('.filtres').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cote], [data-site]');
    if (!b) return;
    if (b.hasAttribute('data-cote')) etat.cote = b.getAttribute('data-cote');
    else etat.site = b.getAttribute('data-site');
    rendre();
  });
  var minuterie = 0;
  document.querySelector('[data-recherche]').addEventListener('input', function (e) {
    clearTimeout(minuterie);
    minuterie = setTimeout(function () { etat.recherche = e.target.value; rendre(); }, 150);
  });
  document.querySelector('[data-plan]').addEventListener('click', function (e) {
    var a = e.target.closest('[data-vers]');
    if (!a) return;
    e.preventDefault();
    history.replaceState(null, '', '#' + a.getAttribute('data-vers'));
    allerA(a.getAttribute('data-vers'), true);
  });
  document.querySelector('[data-ajouter]').addEventListener('click', function () { ouvrirFormulaire(null); });

  function suivreAdresse() {
    var a = lireAdresse();
    if (!a.map) return;
    if (a.map !== etat.map) {
      etat.map = a.map;
      etat.site = '';
      rendre();
    }
    if (a.strat) allerA(a.strat, false);
  }
  window.addEventListener('popstate', suivreAdresse);
  window.addEventListener('hashchange', suivreAdresse);

  // Données reçues de la team : on redessine sans fermer les fiches ouvertes ni bouger la page.
  document.addEventListener('club-donnees', function () {
    if (!Club.map(etat.map)) return;
    if (lienEnAttente) {
      var a = lireAdresse();
      if (a.strat === lienEnAttente) {
        lienEnAttente = '';
        etat.map = a.map;
        ouvertes[a.strat] = true;
        rendre();
        allerA(a.strat, false);
        return;
      }
    }
    var y = window.scrollY;
    rendre();
    window.scrollTo(0, y);
  });

  // Premier rendu, avant le premier affichage : la carte de l'accueil se déploie sur la bonne map.
  var depart = mapDeDepart();
  etat.map = depart.map;
  if (depart.strat) ouvertes[depart.strat] = true;
  rendre();
  if (depart.strat) {
    requestAnimationFrame(function () { allerA(depart.strat, false); });
  }
})();
