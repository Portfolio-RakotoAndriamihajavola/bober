// Page des matchs : à venir (avec le nombre de joueurs dispos au créneau), matchs passés à saisir,
// résultats avec bilan. Mêmes données que l'onglet Matchs de l'ancien site, dans le même format.
(function () {
  var Club = window.Club;
  var el = Club.el;

  var LOGOS_RANG = { platinum: 'platinum logo.png', diamond: 'diamond logo.png', ascendant: 'ascendant logo.png', immortal: 'immortal logo.png', radiant: 'radiant logo.png' };
  var formAvenir = document.querySelector('[data-form-avenir]');
  var formResultat = document.querySelector('[data-form-resultat]');
  var aRemplacer = null; // match à venir que le résultat saisi remplace

  function lienSur(url) {
    try {
      var u = new URL(String(url || ''));
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch (e) { return ''; }
  }
  function libelleType(t) {
    t = String(t || '').toLowerCase();
    return t === 'officiel' ? 'Officiel' : t === 'pracc' ? 'Pracc' : 'Match';
  }
  function score(m) {
    var p = String(m.score || '').match(/(\d+)\s*[-–:\/]\s*(\d+)/);
    if (!p) return null;
    var a = Number(p[1]), b = Number(p[2]);
    return { nous: a, eux: b, issue: a > b ? 'victoire' : a < b ? 'defaite' : 'nul' };
  }
  function lienMap(texte) {
    var map = Club.mapDepuis(texte);
    if (map) return el('a', { href: 'strats.html#' + map.id, 'class': 'puce-map' }, [Club.vignetteMap(map), 'Strats ' + map.nom]);
    return texte ? el('span', { 'class': 'puce-map' }, [texte]) : null;
  }

  // Joueurs dispos à l'heure d'un match, d'après la page des dispos.
  function disposAuCreneau(datetime) {
    var d = new Date(datetime);
    if (isNaN(d)) return null;
    var heure = d.getHours();
    if (Club.HEURES.indexOf(heure) < 0) return null;
    var cle = Club.cleSemaine(Club.lundi(d));
    var jour = (d.getDay() + 6) % 7;
    var c = Club.creneaux(cle).filter(function (x) { return x.jour === jour && x.heure === heure; })[0];
    if (c) c.remplies = Club.JOUEURS.filter(function (p) { return Club.aRempli(cle, p.id); }).length;
    return c;
  }

  function texteDispos(c) {
    if (!c.remplies) return 'Dispos pas encore remplies';
    if (!c.oui.length && !c.peut.length) return 'Personne de dispo à cette heure';
    return Club.pluriel(c.oui.length, 'dispo', 'dispos') + ' à cette heure' + (c.peut.length ? ' (+' + c.peut.length + ' peut-être)' : '');
  }

  function boutonSupprimer(question, action) {
    var b = el('button', { type: 'button', 'class': 'bouton-texte bouton-texte-danger' }, ['Supprimer']);
    b.addEventListener('click', function () { Club.confirmer(b, question, action); });
    return b;
  }

  function supprimerDe(cleStockage, id, texte) {
    Club.modifier(cleStockage, function (v) {
      return v.filter(function (m) { return Club.idMatch(m) !== id; });
    });
    Club.annonce(texte);
  }

  // --- À venir ------------------------------------------------------------------

  function rendreAvenir() {
    var zone = document.querySelector('[data-avenir]');
    Club.vider(zone);
    var matchs = Club.matchsAVenir();
    if (!matchs.length) zone.appendChild(el('li', { 'class': 'vide-ligne' }, ['Aucun match prévu. Ajoute le prochain ci-dessous.']));
    matchs.forEach(function (m) {
      var c = disposAuCreneau(m.datetime);
      var id = Club.idMatch(m);
      zone.appendChild(el('li', { 'class': 'match' }, [
        el('span', { 'class': 'match-date' }, [el('span', { 'class': 'jour' }, [Club.jourCourt(m.datetime)]), el('span', { 'class': 'heure' }, [Club.heure(m.datetime)])]),
        el('div', { 'class': 'match-quoi' }, [
          el('p', { 'class': 'match-titre' }, [el('strong', {}, ['vs ' + m.opponent]), el('span', { 'class': 'pastille-type ' + String(m.type || '').toLowerCase() }, [libelleType(m.type)])]),
          el('p', { 'class': 'match-infos' }, [
            lienMap(m.map),
            c ? el('a', { href: 'dispos.html', 'data-cube': true, 'class': 'dispos-match' + (c.oui.length >= Club.MIN_JOUEURS ? ' jouable' : '') }, [texteDispos(c)]) : null
          ])
        ]),
        el('span', { 'class': 'actions' }, [boutonSupprimer('Supprimer ce match ?', function () { supprimerDe(Club.CLES.avenir, id, 'Match supprimé.'); })])
      ]));
    });

    // Matchs passés sans résultat : un bouton prépare le formulaire de résultat.
    var passes = Club.lire(Club.CLES.avenir).filter(function (m) {
      var t = new Date(m.datetime).getTime();
      return m && m.opponent && !isNaN(t) && t < Date.now() - 3 * 3600 * 1000;
    }).sort(function (a, b) { return new Date(b.datetime) - new Date(a.datetime); });
    var zoneSaisir = document.querySelector('[data-a-saisir]');
    Club.vider(zoneSaisir);
    if (passes.length) {
      zoneSaisir.appendChild(el('p', { 'class': 'etiquette' }, ['Joués, résultat à saisir']));
      zoneSaisir.appendChild(el('ol', { 'class': 'liste-matchs a-saisir' }, passes.map(function (m) {
        var saisir = el('button', { type: 'button', 'class': 'bouton-contour' }, ['Saisir le résultat']);
        saisir.addEventListener('click', function () { preparerResultat(m); });
        var id = Club.idMatch(m);
        return el('li', { 'class': 'match' }, [
          el('span', { 'class': 'match-date' }, [el('span', { 'class': 'jour' }, [Club.jourCourt(m.datetime)]), el('span', { 'class': 'heure' }, [Club.heure(m.datetime)])]),
          el('div', { 'class': 'match-quoi' }, [el('p', { 'class': 'match-titre' }, [el('strong', {}, ['vs ' + m.opponent])]), el('p', { 'class': 'match-infos' }, [lienMap(m.map)])]),
          el('span', { 'class': 'actions' }, [saisir, boutonSupprimer('Retirer ce match sans résultat ?', function () { supprimerDe(Club.CLES.avenir, id, 'Match retiré.'); })])
        ]);
      })));
    }
  }

  function preparerResultat(m) {
    aRemplacer = Club.idMatch(m);
    var details = document.querySelector('[data-ajout-resultat]');
    details.open = true;
    formResultat.reset();
    formResultat.elements.opponent.value = m.opponent;
    var d = new Date(m.datetime);
    formResultat.elements.date.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var map = Club.mapDepuis(m.map);
    formResultat.elements.map.value = map ? map.nom : '';
    formResultat.elements.type.value = String(m.type || 'officiel').toLowerCase() === 'pracc' ? 'pracc' : 'officiel';
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formResultat.elements.nous.focus({ preventScroll: true });
  }

  // --- Résultats ------------------------------------------------------------------

  function rendreResultats() {
    var zone = document.querySelector('[data-resultats]');
    Club.vider(zone);
    var joues = Club.lire(Club.CLES.joues).filter(function (m) { return m && m.opponent; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    if (!joues.length) zone.appendChild(el('li', { 'class': 'vide-ligne' }, ['Aucun résultat pour l\'instant.']));
    joues.forEach(function (m) {
      var s = score(m);
      var id = Club.idMatch(m);
      var logo = LOGOS_RANG[String(m.elo || '').toLowerCase()];
      var review = String(m.reviewPdfDataUrl || '').trim() || lienSur(m.reviewPdf);
      zone.appendChild(el('li', { 'class': 'match' + (s ? ' ' + s.issue : '') }, [
        el('span', { 'class': 'match-date' }, [
          el('span', { 'class': 'jour' }, [m.date ? Club.jourCourt(m.date + 'T12:00') : '']),
          s ? el('span', { 'class': 'score' }, [s.nous + '–' + s.eux]) : el('span', { 'class': 'heure' }, ['—'])
        ]),
        el('div', { 'class': 'match-quoi' }, [
          el('p', { 'class': 'match-titre' }, [
            el('strong', {}, ['vs ' + m.opponent]),
            el('span', { 'class': 'pastille-type ' + String(m.type || '').toLowerCase() }, [libelleType(m.type)]),
            s ? el('span', { 'class': 'pastille-issue ' + s.issue }, [s.issue === 'victoire' ? 'Victoire' : s.issue === 'defaite' ? 'Défaite' : 'Nul']) : null
          ]),
          el('p', { 'class': 'match-infos' }, [
            lienMap(m.map),
            m.elo ? el('span', { 'class': 'rang' }, [logo ? el('img', { src: '../' + encodeURI(logo), alt: '', width: '20', height: '20' }, []) : null, m.elo]) : null,
            lienSur(m.trackerLink) ? el('a', { href: lienSur(m.trackerLink), target: '_blank', rel: 'noopener noreferrer' }, ['Tracker']) : null,
            lienSur(m.videoLink) ? el('a', { href: lienSur(m.videoLink), target: '_blank', rel: 'noopener noreferrer' }, ['Vidéo']) : null,
            review ? el('a', { href: review, download: m.reviewPdfName || 'review.pdf', target: '_blank', rel: 'noopener noreferrer' }, ['Review PDF']) : null
          ])
        ]),
        el('span', { 'class': 'actions' }, [boutonSupprimer('Supprimer ce résultat ?', function () { supprimerDe(Club.CLES.joues, id, 'Résultat supprimé.'); })])
      ]));
    });

    var bilan = joues.map(score).filter(Boolean);
    var v = bilan.filter(function (x) { return x.issue === 'victoire'; }).length;
    var d = bilan.filter(function (x) { return x.issue === 'defaite'; }).length;
    var prochain = Club.matchsAVenir()[0];
    document.querySelector('[data-bilan]').textContent =
      (bilan.length ? Club.pluriel(v, 'victoire', 'victoires') + ' · ' + Club.pluriel(d, 'défaite', 'défaites') : 'Pas encore de score enregistré') +
      (prochain ? ' · prochain : ' + Club.jourCourt(prochain.datetime) + ' à ' + Club.heure(prochain.datetime) + ' contre ' + prochain.opponent : '');
  }

  // --- Formulaires ------------------------------------------------------------------

  document.querySelectorAll('[data-select-map]').forEach(function (s) {
    Club.MAPS.forEach(function (m) { s.appendChild(el('option', { value: m.nom }, [m.nom])); });
  });

  function erreur(form, texte) { form.querySelector('.erreur').textContent = texte || ''; }

  formAvenir.addEventListener('submit', function (e) {
    e.preventDefault();
    var opponent = formAvenir.elements.opponent.value.trim();
    var datetime = formAvenir.elements.datetime.value;
    if (!opponent || !datetime) { erreur(formAvenir, 'Indique l\'adversaire, la date et l\'heure.'); return; }
    erreur(formAvenir, '');
    var match = { id: Club.nouvelId('match'), opponent: opponent, datetime: datetime, map: formAvenir.elements.map.value, type: formAvenir.elements.type.value };
    Club.modifier(Club.CLES.avenir, function (v) {
      if (!v.some(function (m) { return m.id === match.id; })) v.unshift(match);
    });
    formAvenir.reset();
    formAvenir.closest('details').open = false;
    Club.annonce('Match ajouté : ' + Club.jourCourt(datetime) + ' à ' + Club.heure(datetime) + '.');
  });

  formResultat.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = formResultat.elements;
    var opponent = f.opponent.value.trim();
    if (!opponent || !f.date.value || !f.map.value) { erreur(formResultat, 'Indique l\'adversaire, la date et la map.'); return; }
    var nous = f.nous.value, eux = f.eux.value;
    if ((nous === '') !== (eux === '')) { erreur(formResultat, 'Remplis les deux côtés du score, ou aucun.'); return; }
    var tracker = f.trackerLink.value.trim(), video = f.videoLink.value.trim();
    if ((tracker && !lienSur(tracker)) || (video && !lienSur(video))) { erreur(formResultat, 'Les liens doivent commencer par https://'); return; }
    erreur(formResultat, '');
    var resultat = {
      id: Club.nouvelId('resultat'), opponent: opponent, date: f.date.value, map: f.map.value, type: f.type.value, elo: f.elo.value,
      score: nous === '' ? '' : Number(nous) + '-' + Number(eux),
      reviewPdf: '', reviewPdfDataUrl: '', reviewPdfName: '', trackerLink: lienSur(tracker), videoLink: lienSur(video)
    };
    var remplace = aRemplacer;
    Club.modifier(Club.CLES.joues, function (v) {
      if (!v.some(function (m) { return m.id === resultat.id; })) v.unshift(resultat);
    });
    if (remplace) {
      Club.modifier(Club.CLES.avenir, function (v) { return v.filter(function (m) { return Club.idMatch(m) !== remplace; }); });
    }
    aRemplacer = null;
    formResultat.reset();
    formResultat.closest('details').open = false;
    Club.annonce('Résultat enregistré.');
  });

  function rendre() {
    rendreAvenir();
    rendreResultats();
  }
  document.addEventListener('club-donnees', rendre);
  rendre();
})();
