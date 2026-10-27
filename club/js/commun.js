// Interface commune à toutes les pages : bandeau collant (en-tête et frise des sections), pseudo du joueur,
// état du partage, transitions « cube » entre sections, visionneuse d'images, annonces et confirmations.
// Chargé en fin de page, après donnees.js et avant le script de la page.
(function () {
  var Club = window.Club;

  // Crée un élément avec ses attributs et ses enfants (texte ou éléments).
  // Le texte passe par createTextNode : il n'est jamais interprété comme du HTML.
  Club.el = function (balise, attributs, enfants) {
    var svg = balise === 'svg' || balise === 'path' || balise === 'circle' || balise === 'rect';
    var n = svg ? document.createElementNS('http://www.w3.org/2000/svg', balise) : document.createElement(balise);
    Object.keys(attributs || {}).forEach(function (a) {
      var v = attributs[a];
      if (v === false || v === null || v === undefined) return;
      n.setAttribute(a, v === true ? '' : v);
    });
    (enfants || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  };
  var el = Club.el;
  Club.vider = function (n) { while (n.firstChild) n.removeChild(n.firstChild); return n; };

  // Petits pictos au trait (24 × 24), dessinés comme ceux des cartes de l'accueil.
  var PICTOS = {
    qg: 'M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6',
    strats: 'M8 4h8v3H8zM6 6H5v15h14V6h-1M8 12h8M8 16h5',
    dispos: 'M4 6h16v14H4zM4 10h16M9 3v5M15 3v5M8 14l2 2 4-4',
    matchs: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v3M8 20h8M10 17h4v3h-4z'
  };
  Club.picto = function (nom, classe) {
    return el('svg', { 'class': classe || 'picto-mini', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
      el('path', { d: PICTOS[nom] || '' }, [])
    ]);
  };

  // --- Dates en français ------------------------------------------------------

  var fmtJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  var fmtJourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  var fmtDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  Club.jourCourt = function (d) { return fmtJour.format(new Date(d)); };
  Club.jourLong = function (d) { return fmtJourLong.format(new Date(d)); };
  Club.dateLongue = function (d) { return fmtDate.format(new Date(d)); };
  Club.heure = function (d) {
    var x = new Date(d);
    return x.getHours() + ' h' + (x.getMinutes() ? (x.getMinutes() < 10 ? '0' : '') + x.getMinutes() : '');
  };
  Club.pluriel = function (n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); };

  // --- Sections et transitions ------------------------------------------------

  Club.SECTIONS = [
    { page: 'index.html', label: 'QG', picto: 'qg' },
    { page: 'strats.html', label: 'Strats', picto: 'strats' },
    { page: 'dispos.html', label: 'Dispos', picto: 'dispos' },
    { page: 'matchs.html', label: 'Matchs', picto: 'matchs' }
  ];
  function nomPage(href) {
    return String(href || '').split('#')[0].split('?')[0].split('/').pop() || 'index.html';
  }
  Club.pageCourante = function () { return nomPage(location.pathname); };
  function rang(page) {
    for (var i = 0; i < Club.SECTIONS.length; i++) if (Club.SECTIONS[i].page === page) return i;
    return -1;
  }
  // Droite vers une section plus loin dans la frise, gauche vers l'arrière.
  Club.sensVers = function (href) {
    var de = rang(Club.pageCourante()), vers = rang(nomPage(href));
    if (de < 0 || vers < 0 || de === vers) return null;
    return vers > de ? 'droite' : 'gauche';
  };

  // Liens de la frise et liens marqués data-cube : la page tourne vers la section visée.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var lien = e.target.closest ? e.target.closest('.frise a[href], a[data-cube]') : null;
    if (!lien || lien.target === '_blank' || typeof window.cubeTransition !== 'function') return;
    var dir = Club.sensVers(lien.getAttribute('href'));
    if (dir) window.cubeTransition(dir, lien.getAttribute('href'));
  });

  // --- Bandeau des pages intérieures -------------------------------------------

  function construireBandeau() {
    var place = document.querySelector('[data-bandeau]');
    if (!place) return;
    var courante = Club.pageCourante();
    var frise = el('ol', { 'class': 'frise' }, Club.SECTIONS.map(function (s, i) {
      var ici = s.page === courante;
      return el('li', { 'data-section': s.page, 'class': ici ? 'en-cours' : '', style: '--i:' + i }, [
        el('a', { href: s.page, 'aria-current': ici ? 'page' : false }, [
          el('span', { 'class': 'noeud' }, [Club.picto(s.picto)]),
          el('span', { 'class': 'frise-label' }, [s.label]),
          el('span', { 'class': 'frise-duree', 'data-compte': s.page }, [''])
        ])
      ]);
    }));
    var bandeau = el('header', { 'class': 'bandeau' }, [
      el('div', { 'class': 'course-head' }, [
        el('a', { 'class': 'titre', href: 'index.html', 'data-cube': true, 'aria-label': 'BOBER #WIPR, retour au QG' }, [
          el('span', { 'class': 'logo-mini' }, [el('img', { src: '../Logo%20bober%20H.png', alt: '', width: '42', height: '42' }, [])]),
          el('span', {}, ['BOBER #WIPR'])
        ]),
        el('div', { 'class': 'actions' }, [etatSync(), pastilleJoueur('pilule-joueur')])
      ]),
      el('nav', { 'class': 'frise-wrap entree', 'aria-label': 'Sections du site' }, [frise])
    ]);
    place.parentNode.replaceChild(bandeau, place);

    // Bandeau compact au défilement ; sa hauteur sert aux ancres et au plan collant.
    // Il est fixe et la page garde la place de sa version pleine : en se réduisant,
    // il ne fait pas remonter le contenu (une ancre visée reste bien sous lui).
    document.body.classList.add('avec-bandeau');
    var reduit = false;
    var suivre = function () {
      var r = document.documentElement.style;
      if (!reduit) r.setProperty('--haut-plein', bandeau.offsetHeight + 'px');
      r.setProperty('--haut-bandeau', bandeau.offsetHeight + 'px');
    };
    window.addEventListener('scroll', function () {
      var r = window.scrollY > 80;
      if (r !== reduit) {
        reduit = r;
        bandeau.classList.toggle('reduit', r);
        setTimeout(suivre, 460);
      }
    }, { passive: true });
    window.addEventListener('resize', suivre);
    suivre();
  }

  // Compteurs sous chaque nœud de la frise, et ✓ sur Dispos quand ta semaine est remplie.
  Club.rafraichirFrise = function () {
    var semaine = Club.cleSemaine(Club.lundi());
    var nb = Club.strats().length;
    var rempli = Club.JOUEURS.filter(function (p) { return Club.aRempli(semaine, p.id); }).length;
    var prochain = Club.matchsAVenir()[0];
    var textes = {
      'index.html': 'Accueil',
      'strats.html': Club.pluriel(nb, 'strat', 'strats'),
      'dispos.html': rempli + '/' + Club.JOUEURS.length + ' remplies',
      'matchs.html': prochain ? Club.jourCourt(prochain.datetime) + ' · ' + Club.heure(prochain.datetime) : 'Aucun prévu'
    };
    document.querySelectorAll('[data-compte]').forEach(function (n) {
      n.textContent = textes[n.getAttribute('data-compte')] || '';
    });
    var moi = Club.joueur();
    var joue = Club.JOUEURS.some(function (p) { return p.id === moi; });
    var li = document.querySelector('.frise li[data-section="dispos.html"]');
    if (li) {
      var faite = joue && Club.aRempli(semaine, moi);
      li.classList.toggle('fait', faite);
      li.classList.toggle('a-remplir', joue && !faite);
    }
  };

  // --- Partage : pastille d'état ---------------------------------------------

  var TEXTES_SYNC = {
    connexion: 'Connexion…',
    'en-ligne': 'Partagé avec la team',
    envoi: 'Envoi…',
    'hors-ligne': 'Hors ligne · sur cet appareil',
    partiel: 'Partagé en partie'
  };
  var NOMS_CLES = { boberClubStrats: 'les strats', boberClubDispos: 'les dispos', boberUpcomingMatches: 'les matchs à venir', boberPlayedMatches: 'les résultats' };
  function listeRefusees() {
    var noms = Club.clesRefusees().map(function (c) { return NOMS_CLES[c] || c; });
    return noms.length > 1 ? noms.slice(0, -1).join(', ') + ' et ' + noms[noms.length - 1] : noms[0] || '';
  }
  function etatSync() {
    var n = el('span', { 'class': 'etat-sync', 'data-etat-sync': true, role: 'status' }, [
      el('span', { 'class': 'point', 'aria-hidden': 'true' }, []),
      el('span', { 'class': 'etat-texte' }, [''])
    ]);
    majEtat(n);
    return n;
  }
  function majEtat(n) {
    var e = Club.etatSync();
    n.setAttribute('data-etat', e);
    n.querySelector('.etat-texte').textContent = TEXTES_SYNC[e] || '';
    n.title = e === 'hors-ligne'
      ? 'Le serveur de la team ne répond pas. Tes changements restent sur cet appareil et partent au retour du réseau, tant que la page reste ouverte.'
      : e === 'partiel'
        ? 'Le serveur de la team n\'accepte pas encore ' + listeRefusees() + ' : pour l\'instant, ces données restent sur cet appareil. Il faut les autoriser côté serveur (voir club/README.md).'
        : '';
  }
  document.addEventListener('club-sync', function () {
    document.querySelectorAll('[data-etat-sync]').forEach(majEtat);
  });
  Club.etatSyncNoeud = etatSync;

  // --- Pseudo du joueur -------------------------------------------------------

  function avatar(p, taille) {
    if (p && p.photo) return el('img', { 'class': 'avatar', src: p.photo, alt: '', width: taille, height: taille, loading: 'lazy' }, []);
    return el('span', { 'class': 'avatar avatar-lettre', 'aria-hidden': 'true' }, [p ? p.nom.charAt(0) : '?']);
  }
  Club.avatar = avatar;

  function pastilleJoueur(classe) {
    var b = el('button', { type: 'button', 'class': classe, 'data-pastille-joueur': true }, []);
    remplirPastille(b);
    b.addEventListener('click', function () { Club.demanderJoueur(); });
    return b;
  }
  Club.pastilleJoueur = pastilleJoueur;
  function remplirPastille(b) {
    var p = Club.personne(Club.joueur());
    Club.vider(b);
    b.appendChild(avatar(p, 26));
    b.appendChild(el('span', {}, [p ? p.nom : 'Qui es-tu ?']));
    b.setAttribute('aria-label', p ? 'Tu es ' + p.nom + '. Changer de pseudo' : 'Choisir ton pseudo');
  }
  document.addEventListener('club-joueur', function () {
    document.querySelectorAll('[data-pastille-joueur]').forEach(remplirPastille);
    Club.rafraichirFrise();
  });

  var dialogueJoueur = null;
  Club.demanderJoueur = function (raison) {
    if (typeof HTMLDialogElement !== 'function') return;
    if (!dialogueJoueur) {
      dialogueJoueur = el('dialog', { 'class': 'dialogue dialogue-joueur', 'aria-labelledby': 'titre-joueur' }, []);
      document.body.appendChild(dialogueJoueur);
      dialogueJoueur.addEventListener('click', function (e) { if (e.target === dialogueJoueur) dialogueJoueur.close(); });
    }
    var moi = Club.joueur();
    Club.vider(dialogueJoueur);
    var liste = el('ul', { 'class': 'choix-joueurs' }, Club.JOUEURS.concat(Club.STAFF).map(function (p) {
      var b = el('button', { type: 'button', 'aria-pressed': p.id === moi ? 'true' : 'false' }, [
        avatar(p, 44), el('span', { 'class': 'nom' }, [p.nom]), el('span', { 'class': 'role' }, [p.role])
      ]);
      b.addEventListener('click', function () {
        Club.choisirJoueur(p.id);
        dialogueJoueur.close();
        Club.annonce('Tu es ' + p.nom + ' sur cet appareil.');
      });
      return el('li', {}, [b]);
    }));
    var fermer = el('button', { type: 'button', 'class': 'bouton-texte' }, ['Fermer']);
    fermer.addEventListener('click', function () { dialogueJoueur.close(); });
    dialogueJoueur.appendChild(el('h2', { id: 'titre-joueur' }, ['Qui es-tu ?']));
    dialogueJoueur.appendChild(el('p', { 'class': 'small' }, [raison || 'Ton pseudo signe tes strats et tes dispos. Il reste sur cet appareil.']));
    dialogueJoueur.appendChild(liste);
    dialogueJoueur.appendChild(el('div', { 'class': 'pied-dialogue' }, [fermer]));
    dialogueJoueur.showModal();
    var choisi = dialogueJoueur.querySelector('[aria-pressed="true"]') || dialogueJoueur.querySelector('.choix-joueurs button');
    if (choisi) choisi.focus();
  };

  // --- Visionneuse ------------------------------------------------------------

  var visionneuse = null;
  Club.ouvrirImage = function (src, legende) {
    if (typeof HTMLDialogElement !== 'function') { window.open(src, '_blank', 'noopener'); return; }
    if (!visionneuse) {
      var fermer = el('button', { type: 'button' }, ['Fermer']);
      visionneuse = el('dialog', { 'class': 'visionneuse', 'aria-label': 'Image en grand' }, [
        el('img', { alt: '' }, []), el('div', { 'class': 'pied' }, [el('span', {}, []), fermer])
      ]);
      document.body.appendChild(visionneuse);
      fermer.addEventListener('click', function () { visionneuse.close(); });
      visionneuse.addEventListener('click', function (e) { if (e.target === visionneuse) visionneuse.close(); });
    }
    var image = visionneuse.querySelector('img');
    image.src = src;
    image.alt = legende || '';
    visionneuse.querySelector('.pied span').textContent = legende || '';
    visionneuse.showModal();
  };
  // Toute image marquée data-agrandir s'ouvre en grand, à la souris comme au clavier.
  function agrandir(e) {
    var img = e.target.closest ? e.target.closest('img[data-agrandir]') : null;
    if (!img) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    Club.ouvrirImage(img.currentSrc || img.src, img.getAttribute('data-legende') || img.alt);
  }
  document.addEventListener('click', agrandir);
  document.addEventListener('keydown', agrandir);

  // --- Annonces et confirmations ----------------------------------------------

  var zoneAnnonce = null, minuterieAnnonce = 0;
  Club.annonce = function (texte) {
    if (!zoneAnnonce) {
      zoneAnnonce = el('p', { 'class': 'annonce', role: 'status', 'aria-live': 'polite' }, []);
      document.body.appendChild(zoneAnnonce);
    }
    zoneAnnonce.textContent = texte;
    zoneAnnonce.classList.add('visible');
    clearTimeout(minuterieAnnonce);
    minuterieAnnonce = setTimeout(function () { zoneAnnonce.classList.remove('visible'); }, 2600);
  };

  // Confirmation dans la page (les fenêtres confirm() ne sont pas fiables partout) :
  // le bouton laisse place à « Oui » et « Non » le temps de répondre.
  Club.confirmer = function (bouton, question, action) {
    var zone = el('span', { 'class': 'confirmation', role: 'group', 'aria-label': question }, [
      el('span', {}, [question]),
      el('button', { type: 'button', 'class': 'bouton-danger' }, ['Oui']),
      el('button', { type: 'button', 'class': 'bouton-texte' }, ['Non'])
    ]);
    var boutons = zone.querySelectorAll('button');
    bouton.hidden = true;
    bouton.parentNode.insertBefore(zone, bouton.nextSibling);
    boutons[1].focus();
    function fin() { zone.remove(); bouton.hidden = false; bouton.focus(); }
    boutons[0].addEventListener('click', function () { zone.remove(); bouton.hidden = false; action(); });
    boutons[1].addEventListener('click', fin);
  };

  Club.copier = function (texte) {
    function secours() {
      var zone = el('textarea', { 'class': 'hors-ecran', readonly: true }, [texte]);
      document.body.appendChild(zone);
      zone.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      zone.remove();
      Club.annonce(ok ? 'Lien copié.' : 'Copie impossible : ' + texte);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).then(function () { Club.annonce('Lien copié.'); }, secours);
    } else {
      secours();
    }
  };

  // Vignette d'une map : son image, ou un carré à l'initiale tant que le dépôt n'a pas l'image.
  Club.vignetteMap = function (map) {
    if (map.image) return el('img', { src: '../' + map.image, alt: '', loading: 'lazy' }, []);
    return el('span', { 'class': 'vignette-vide', 'aria-hidden': 'true' }, [map.nom.charAt(0)]);
  };

  // Interrupteur « Map pool » : n'affiche que les maps du pool compétitif, ou toutes.
  Club.interrupteurPool = function (classe) {
    var nbPool = Club.MAPS.filter(function (m) { return m.pool; }).length;
    var compte = el('span', { 'class': 'interrupteur-compte' }, ['']);
    var b = el('button', { type: 'button', role: 'switch', 'class': 'interrupteur' + (classe ? ' ' + classe : ''),
      title: 'Map pool ' + Club.POOL_NOM + ' : ' + Club.MAPS.filter(function (m) { return m.pool; }).map(function (m) { return m.nom; }).join(', ') }, [
      el('span', { 'class': 'interrupteur-piste', 'aria-hidden': 'true' }, [el('span', { 'class': 'interrupteur-bouton' }, [])]),
      el('span', { 'class': 'interrupteur-texte' }, ['Map pool']),
      compte
    ]);
    function maj() {
      var actif = Club.filtrePool();
      b.setAttribute('aria-checked', actif ? 'true' : 'false');
      compte.textContent = actif ? nbPool + ' maps' : 'toutes les maps';
    }
    b.addEventListener('click', function () { Club.choisirFiltrePool(!Club.filtrePool()); });
    document.addEventListener('club-filtre-maps', maj);
    maj();
    return b;
  };

  // Puces d'agents : icône quand elle existe, couleur du rôle sinon.
  Club.puceAgent = function (nom) {
    var a = Club.agent(nom);
    return el('li', { 'class': (a.role || '') + (a.icone ? '' : ' sans-icone'), title: a.role ? a.nom + ', ' + Club.ROLES[a.role].toLowerCase() : a.nom }, [
      a.icone ? el('img', { src: a.icone, alt: '', loading: 'lazy', width: '24', height: '24' }, []) : null,
      a.nom
    ]);
  };

  construireBandeau();
  Club.rafraichirFrise();
  document.addEventListener('club-donnees', Club.rafraichirFrise);
})();
