// Accueil : cartes des maps pour le carrousel (avant carrousel.js), badge du prochain match,
// résumé de la semaine, prochains matchs, dernières strats et roster.
(function () {
  var Club = window.Club;
  var el = Club.el;

  // Pictos des cartes (48 × 48), tracés en boucle comme ceux du e-learning.
  var PICTO_STRATS = 'M16 8h16v6H16zM12 11H9v31h30V11h-3M16 22h16M16 29h16M16 36h9';
  var PICTO_VIDE = 'M24 6v10M24 32v10M6 24h10M32 24h10M24 13a11 11 0 1 0 0.01 0';

  function compter(mapId) {
    var strats = Club.stratsDe(mapId);
    var map = Club.map(mapId);
    var att = strats.filter(function (s) { return s.cote === 'attaque'; });
    var def = strats.filter(function (s) { return s.cote === 'defense'; });
    // Couverture : chaque site a-t-il une strat d'attaque et une de défense ?
    var couverts = 0;
    map.sites.forEach(function (site) {
      if (att.some(function (s) { return s.site === site; })) couverts++;
      if (def.some(function (s) { return s.site === site; })) couverts++;
    });
    return { total: strats.length, att: att.length, def: def.length, couverture: couverts / (map.sites.length * 2) };
  }

  function mapDuProchainMatch() {
    var m = Club.matchsAVenir()[0];
    var map = m ? Club.mapDepuis(m.map) : null;
    return map ? map.id : '';
  }

  function carte(map) {
    return el('li', { 'class': 'carte map' + (map.image ? '' : ' sans-image') + (map.pool ? '' : ' hors-pool'), 'data-carte': map.id }, [
      map.image ? el('img', { 'class': 'carte-fond', src: '../' + map.image, alt: '', draggable: 'false' }, []) : null,
      el('a', { 'class': 'carte-lien', href: 'strats.html#' + map.id, 'data-href': 'strats.html#' + map.id, draggable: 'false' }, [
        el('span', { 'class': 'carte-corps' }, [
          el('span', { 'class': 'carte-num' }, [map.sites.length + ' sites' + (map.pool ? '' : ' · hors pool')]),
          el('svg', { 'class': 'picto', viewBox: '0 0 48 48', 'aria-hidden': 'true' }, [el('path', { d: PICTO_VIDE }, [])]),
          el('span', { 'class': 'carte-titre' }, [map.nom]),
          el('span', { 'class': 'carte-meta' }, [''])
        ])
      ]),
      el('span', { 'class': 'carte-pastille', 'aria-hidden': 'true' }, []),
      el('div', { 'class': 'bar', title: '' }, [el('span', {}, [])]),
      el('p', { 'class': 'carte-etat' }, [''])
    ]);
  }

  function rafraichirCartes() {
    var prochaine = mapDuProchainMatch();
    Club.MAPS.forEach(function (map) {
      var c = compter(map.id);
      document.querySelectorAll('[data-carte="' + map.id + '"]').forEach(function (n) {
        n.setAttribute('data-statut', map.id === prochaine ? 'en-cours' : (c.total ? 'fait' : ''));
        n.classList.toggle('prochain', map.id === prochaine);
        n.querySelector('.carte-meta').textContent = c.total ? Club.pluriel(c.total, 'strat', 'strats') : 'Aucune strat';
        n.querySelector('.carte-etat').textContent = c.total ? c.att + ' att. · ' + c.def + ' déf.' : 'Ajoute la première';
        n.querySelector('.picto path').setAttribute('d', c.total ? PICTO_STRATS : PICTO_VIDE);
        var bar = n.querySelector('.bar');
        bar.title = 'Sites couverts en attaque et en défense : ' + Math.round(c.couverture * 100) + ' %';
        bar.querySelector('span').style.transform = 'scaleX(' + c.couverture + ')';
        var lien = n.querySelector('.carte-lien');
        lien.setAttribute('aria-label', map.nom + ', ' + (c.total ? Club.pluriel(c.total, 'strat', 'strats') : 'aucune strat') +
          (map.id === prochaine ? ', map du prochain match' : ''));
      });
    });
  }

  // --- Héros ------------------------------------------------------------------

  function rafraichirHeros() {
    var m = Club.matchsAVenir()[0];
    var badge = document.querySelector('[data-badge]');
    if (badge) {
      badge.textContent = m
        ? 'Prochain match · ' + Club.jourCourt(m.datetime) + ' · ' + Club.heure(m.datetime) + ' · vs ' + m.opponent
        : 'Aucun match prévu · ajoute le prochain dans Matchs';
    }
    var moi = Club.joueur();
    var joueur = Club.JOUEURS.some(function (p) { return p.id === moi; });
    var fait = joueur && Club.aRempli(Club.cleSemaine(Club.lundi()), moi);
    var bouton = document.querySelector('[data-bouton-dispos]');
    var note = document.querySelector('[data-note-action]');
    if (bouton) bouton.textContent = fait ? 'Voir les dispos de la team' : 'Remplir mes dispos';
    if (note) {
      Club.vider(note);
      if (fait) note.append('Dispos remplies, ', el('br', {}, []), 'merci !');
      else note.append('Tes dispos de ', el('br', {}, []), 'la semaine');
    }
  }

  // --- Cette semaine ----------------------------------------------------------

  function rafraichirSemaine() {
    var zone = document.querySelector('[data-semaine]');
    if (!zone) return;
    var lundi = Club.lundi();
    var cle = Club.cleSemaine(lundi);
    var remplis = Club.JOUEURS.filter(function (p) { return Club.aRempli(cle, p.id); });

    var aujourdhui = (new Date().getDay() + 6) % 7;
    var heureMaintenant = new Date().getHours();
    var meilleurs = Club.creneaux(cle).filter(function (c) {
      return c.oui.length && (c.jour > aujourdhui || (c.jour === aujourdhui && c.heure >= heureMaintenant));
    }).sort(function (a, b) {
      return (b.oui.length - a.oui.length) || (b.peut.length - a.peut.length) || (a.jour - b.jour) || (a.heure - b.heure);
    }).slice(0, 3);

    Club.vider(zone);
    zone.appendChild(el('p', {}, [
      el('strong', {}, [remplis.length + ' sur ' + Club.JOUEURS.length]),
      ' ont rempli leurs dispos de la semaine du ' + Club.jourLong(lundi).replace(/^\S+\s/, '') + '.'
    ]));
    zone.appendChild(el('ul', { 'class': 'avatars' }, Club.JOUEURS.map(function (p) {
      var ok = remplis.indexOf(p) >= 0;
      return el('li', { 'class': ok ? 'ok' : '', title: p.nom + (ok ? ' : dispos remplies' : ' : pas encore rempli') }, [
        Club.avatar(p, 36), el('span', { 'class': 'hors-ecran' }, [p.nom + (ok ? ', rempli' : ', pas encore rempli')])
      ]);
    })));
    if (meilleurs.length) {
      zone.appendChild(el('p', { 'class': 'etiquette' }, ['Meilleurs créneaux à venir']));
      zone.appendChild(el('ol', { 'class': 'creneaux-courts' }, meilleurs.map(function (c) {
        var jour = Club.decaler(lundi, c.jour);
        var jouable = c.oui.length >= Club.MIN_JOUEURS;
        return el('li', { 'class': jouable ? 'jouable' : '' }, [
          el('span', { 'class': 'quand' }, [Club.jourCourt(jour) + ' · ' + c.heure + ' h']),
          el('span', { 'class': 'combien' }, [Club.pluriel(c.oui.length, 'dispo', 'dispos') + (c.peut.length ? ' + ' + c.peut.length + ' peut-être' : '')]),
          jouable ? el('span', { 'class': 'pastille-jouable' }, ['On peut jouer']) : null
        ]);
      })));
    } else {
      zone.appendChild(el('p', { 'class': 'small' }, ['Pas encore de créneau commun : dès que les dispos arrivent, les meilleurs s\'affichent ici.']));
    }
    zone.appendChild(el('p', { 'class': 'lien-suite' }, [el('a', { href: 'dispos.html', 'data-cube': true }, ['Ouvrir les dispos →'])]));
  }

  // --- Prochains matchs -------------------------------------------------------

  Club.ligneMatch = function (m) {
    var map = Club.mapDepuis(m.map);
    var type = String(m.type || '').toLowerCase();
    return el('li', { 'class': 'match-court' }, [
      el('span', { 'class': 'match-date' }, [
        el('span', { 'class': 'jour' }, [Club.jourCourt(m.datetime)]),
        el('span', { 'class': 'heure' }, [Club.heure(m.datetime)])
      ]),
      el('span', { 'class': 'match-quoi' }, [
        el('strong', {}, ['vs ' + m.opponent]),
        el('span', { 'class': 'small' }, [
          type === 'officiel' ? 'Officiel' : type === 'pracc' ? 'Pracc' : 'Match',
          map ? ' · ' : '', map ? el('a', { href: 'strats.html#' + map.id }, ['Strats ' + map.nom]) : (m.map ? ' · ' + m.map : '')
        ])
      ])
    ]);
  };

  function rafraichirProchains() {
    var zone = document.querySelector('[data-prochains]');
    if (!zone) return;
    var matchs = Club.matchsAVenir().slice(0, 3);
    Club.vider(zone);
    if (matchs.length) {
      zone.appendChild(el('ol', { 'class': 'matchs-courts' }, matchs.map(Club.ligneMatch)));
    } else {
      zone.appendChild(el('p', { 'class': 'small' }, ['Aucun match prévu pour l\'instant.']));
    }
    zone.appendChild(el('p', { 'class': 'lien-suite' }, [el('a', { href: 'matchs.html', 'data-cube': true }, ['Tous les matchs →'])]));
  }

  // --- Dernières strats -------------------------------------------------------

  function rafraichirDernieres() {
    var zone = document.querySelector('[data-dernieres]');
    if (!zone) return;
    var strats = Club.strats().slice().sort(function (a, b) { return String(b.maj).localeCompare(String(a.maj)); }).slice(0, 4);
    Club.vider(zone);
    strats.forEach(function (s) {
      var map = Club.map(s.map);
      var image = (s.etapes || []).filter(function (e) { return e.image; })[0];
      var auteur = Club.personne(s.auteur);
      zone.appendChild(el('li', {}, [
        el('a', { href: 'strats.html#' + s.id }, [
          image ? el('img', { src: image.image, alt: '', loading: 'lazy' }, []) : Club.vignetteMap(map),
          el('span', { 'class': 'texte' }, [
            el('span', { 'class': 'surtitre' }, [map.nom + ' · ' + (s.cote === 'attaque' ? 'Attaque' : 'Défense') + ' ' + s.site]),
            el('strong', {}, [s.titre]),
            el('span', { 'class': 'small' }, [(auteur ? auteur.nom : 'Playbook') + ' · ' + Club.dateLongue(s.maj)])
          ])
        ])
      ]));
    });
  }

  // --- Roster -----------------------------------------------------------------

  function rafraichirRoster() {
    var zone = document.querySelector('[data-roster]');
    if (!zone) return;
    var cle = Club.cleSemaine(Club.lundi());
    Club.vider(zone);
    Club.JOUEURS.forEach(function (p) {
      var ok = Club.aRempli(cle, p.id);
      zone.appendChild(el('li', {}, [
        Club.avatar(p, 56),
        el('span', { 'class': 'nom' }, [p.nom]),
        el('span', { 'class': 'role' }, [p.role]),
        el('ul', { 'class': 'agents' }, p.agents.map(Club.puceAgent)),
        el('span', { 'class': 'etat-dispo' + (ok ? ' ok' : '') }, [ok ? 'Dispos remplies' : 'Dispos à remplir'])
      ]));
    });
  }

  function rafraichirLigneEtat() {
    var zone = document.querySelector('[data-ligne-etat]');
    if (!zone || zone.firstChild) return;
    zone.appendChild(Club.etatSyncNoeud());
    zone.appendChild(el('span', { 'class': 'small' }, ['Strats, dispos et matchs sont partagés avec toute la team.']));
  }

  function toutRafraichir() {
    rafraichirCartes();
    rafraichirHeros();
    rafraichirSemaine();
    rafraichirProchains();
    rafraichirDernieres();
    rafraichirRoster();
  }

  // Les cartes existent avant carrousel.js, qui les place et les clone au besoin.
  // Toutes les maps ont leur carte ; le filtre « map pool » masque celles hors du pool,
  // sauf la map du prochain match. Renvoie true si une carte a été masquée ou montrée.
  var liste = document.querySelector('[data-cartes]');
  function filtrerCartes() {
    if (!liste) return false;
    var visibles = Club.mapsVisibles(mapDuProchainMatch()).map(function (m) { return m.id; });
    var change = false;
    liste.querySelectorAll('.carte:not(.copie)').forEach(function (n) {
      var cache = visibles.indexOf(n.getAttribute('data-carte')) < 0;
      if (n.hidden !== cache) { n.hidden = cache; change = true; }
    });
    return change;
  }
  if (liste) {
    Club.MAPS.forEach(function (map) { liste.appendChild(carte(map)); });
    filtrerCartes();
    document.addEventListener('club-filtre-maps', function () {
      if (filtrerCartes()) document.dispatchEvent(new CustomEvent('cartes-filtrees'));
    });
  }
  var placeFiltre = document.querySelector('[data-filtre-maps]');
  if (placeFiltre) placeFiltre.parentNode.replaceChild(Club.interrupteurPool('filtre-heros'), placeFiltre);
  var place = document.querySelector('[data-place-joueur]');
  if (place) place.parentNode.replaceChild(Club.pastilleJoueur('pilule pilule-verte'), place);
  rafraichirLigneEtat();
  toutRafraichir();

  var prochaineAvant = mapDuProchainMatch();
  document.addEventListener('club-donnees', function () {
    toutRafraichir();
    var maintenant = mapDuProchainMatch();
    if (maintenant !== prochaineAvant) {
      prochaineAvant = maintenant;
      if (filtrerCartes()) document.dispatchEvent(new CustomEvent('cartes-filtrees'));
      document.dispatchEvent(new CustomEvent('cartes-pretes'));
    }
  });
  document.addEventListener('club-joueur', rafraichirHeros);
})();
