// Page des dispos : chaque joueur remplit sa semaine (une case par jour et par heure, du lundi au dimanche,
// de 18 h à minuit), la team voit combien sont dispos sur chaque créneau et lesquels sont jouables à cinq.
// Toucher une case la fait passer de vide à dispo, puis peut-être ; glisser remplit plusieurs cases.
(function () {
  var Club = window.Club;
  var el = Club.el;

  var SUIVANT = { '': 'oui', oui: 'peut', peut: '' };
  var TEXTE = { '': 'pas dispo', oui: 'dispo', peut: 'peut-être' };
  var semaineAffichee = Club.lundi();
  var brouillon = {}; // cases du joueur pour la semaine affichée : { 'jour-heure': 'oui' | 'peut' }
  var aucune = false; // « pas dispo cette semaine »
  var creneauChoisi = null; // case de la vue équipe dont on lit le détail
  var peinture = null; // geste en cours sur la grille du joueur : { valeur, change }
  var mois = new Intl.DateTimeFormat('fr-FR', { month: 'long' });

  function cle() { return Club.cleSemaine(semaineAffichee); }
  function moi() {
    var id = Club.joueur();
    return Club.JOUEURS.some(function (p) { return p.id === id; }) ? id : '';
  }
  function finCreneau(jour, heure) {
    var d = Club.decaler(semaineAffichee, jour);
    d.setHours(heure + 1, 0, 0, 0);
    return d;
  }
  function passe(jour, heure) { return finCreneau(jour, heure).getTime() < Date.now(); }

  function chargerBrouillon() {
    var e = Club.disposSemaine(cle())[moi()];
    brouillon = e && e.c ? JSON.parse(JSON.stringify(e.c)) : {};
    aucune = !!(e && e.aucune);
  }

  // Matchs prévus dans la semaine affichée, rangés par case.
  function matchsParCase() {
    var res = {};
    var debut = semaineAffichee.getTime(), fin = Club.decaler(semaineAffichee, 7).getTime();
    Club.lire(Club.CLES.avenir).forEach(function (m) {
      var d = new Date(m.datetime);
      if (isNaN(d) || d.getTime() < debut || d.getTime() >= fin) return;
      var jour = (d.getDay() + 6) % 7;
      var heure = Math.max(Club.HEURES[0], Math.min(Club.HEURES[Club.HEURES.length - 1], d.getHours()));
      (res[jour + '-' + heure] = res[jour + '-' + heure] || []).push(m);
    });
    return res;
  }
  function etiquetteMatch(liste) {
    var t = String(liste[0].type || '').toLowerCase();
    return t === 'pracc' ? 'Pracc' : 'Match';
  }

  // --- En-tête ------------------------------------------------------------------

  function rendreEntete() {
    var lundi = semaineAffichee, dimanche = Club.decaler(lundi, 6);
    var actuelle = cle() === Club.cleSemaine(Club.lundi());
    function quantieme(d) { return d.getDate() === 1 ? '1er' : String(d.getDate()); }
    var debut = quantieme(lundi) + (lundi.getMonth() !== dimanche.getMonth() ? ' ' + mois.format(lundi) : '');
    document.querySelector('[data-titre-semaine]').textContent = 'Du ' + debut + ' au ' + quantieme(dimanche) + ' ' + mois.format(dimanche);
    var remplis = Club.JOUEURS.filter(function (p) { return Club.aRempli(cle(), p.id); }).length;
    document.querySelector('[data-meta-semaine]').textContent =
      (actuelle ? 'Cette semaine · ' : '') + remplis + ' sur ' + Club.JOUEURS.length + ' ont rempli leurs dispos';
    document.querySelector('[data-semaine="0"]').disabled = actuelle;
  }

  // --- Mes dispos ---------------------------------------------------------------

  function grille(options) {
    var matchs = matchsParCase();
    var g = el('div', { 'class': 'grille' + (options.equipe ? ' grille-equipe' : ' grille-perso'), role: 'grid', 'aria-label': options.label }, []);
    var tete = el('div', { 'class': 'ligne-grille tete', role: 'row' }, [el('span', { 'class': 'coin', role: 'columnheader' }, [])]);
    Club.JOURS.forEach(function (j, i) {
      var d = Club.decaler(semaineAffichee, i);
      var aujourdhui = d.toDateString() === new Date().toDateString();
      var contenu = [el('span', { 'class': 'jour-court' }, [j.slice(0, 3)]), el('span', { 'class': 'jour-num' }, [String(d.getDate())])];
      var tetiere = options.equipe
        ? el('span', { 'class': 'jour' + (aujourdhui ? ' aujourdhui' : ''), role: 'columnheader' }, contenu)
        : el('button', { type: 'button', 'class': 'jour' + (aujourdhui ? ' aujourdhui' : ''), role: 'columnheader', 'data-jour': i,
            'aria-label': j + ' ' + d.getDate() + ' : toute la soirée', disabled: Club.HEURES.every(function (h) { return passe(i, h); }) }, contenu);
      tete.appendChild(tetiere);
    });
    g.appendChild(tete);
    Club.HEURES.forEach(function (h) {
      var ligne = el('div', { 'class': 'ligne-grille', role: 'row' }, [el('span', { 'class': 'heure', role: 'rowheader' }, [h + ' h'])]);
      for (var j = 0; j < 7; j++) {
        var k = j + '-' + h;
        ligne.appendChild(options.cellule(j, h, k, matchs[k]));
      }
      g.appendChild(ligne);
    });
    return g;
  }

  function celluleMoi(j, h, k, matchs) {
    var v = brouillon[k] || '';
    var b = el('button', { type: 'button', role: 'gridcell', 'class': 'case' + (v ? ' ' + v : '') + (matchs ? ' avec-match' : ''),
      'data-case': k, tabindex: '-1', disabled: passe(j, h),
      'data-match': matchs ? ', ' + etiquetteMatch(matchs).toLowerCase() + ' contre ' + matchs[0].opponent : false }, [
      matchs ? el('span', { 'class': 'marque-match', title: 'vs ' + matchs[0].opponent }, [etiquetteMatch(matchs)]) : null
    ]);
    nommerCase(b, v);
    return b;
  }
  function nommerCase(b, v) {
    var p = b.getAttribute('data-case').split('-').map(Number);
    b.setAttribute('aria-label', Club.JOURS[p[0]] + ' ' + p[1] + ' h : ' + TEXTE[v] + (b.getAttribute('data-match') || ''));
  }

  function poser(b, v) {
    var k = b.getAttribute('data-case');
    if (v) brouillon[k] = v; else delete brouillon[k];
    b.classList.remove('oui', 'peut');
    if (v) b.classList.add(v);
    nommerCase(b, v);
  }

  // Enregistre la semaine du joueur telle qu'elle est à l'écran (rejouable sur des données plus récentes).
  function enregistrer() {
    var id = moi(), sem = cle(), cases = JSON.parse(JSON.stringify(brouillon)), sansDispo = aucune && !Object.keys(cases).length;
    var maj = new Date().toISOString();
    var limite = Club.cleSemaine(Club.decaler(Club.lundi(), -70));
    Club.modifier(Club.CLES.dispos, function (tout) {
      var s = tout[sem] && typeof tout[sem] === 'object' ? tout[sem] : (tout[sem] = {});
      if (!Object.keys(cases).length && !sansDispo) delete s[id];
      else s[id] = { c: cases, aucune: sansDispo, maj: maj };
      // On garde dix semaines d'historique : le stockage partagé reste léger.
      Object.keys(tout).forEach(function (w) { if (w < limite) delete tout[w]; });
    });
  }

  function rendreMesDispos() {
    var zone = document.querySelector('[data-mes-dispos]');
    Club.vider(zone);
    var id = moi();
    if (!id) {
      var choisir = el('button', { type: 'button', 'class': 'cta' }, ['Choisir mon pseudo']);
      choisir.addEventListener('click', function () { Club.demanderJoueur('Choisis ton pseudo pour remplir tes dispos.'); });
      zone.appendChild(el('div', { 'class': 'vide-strats' }, [
        el('p', {}, [Club.joueur() ? 'Les dispos se remplissent par joueur.' : 'Dis-nous qui tu es pour remplir tes dispos.']),
        el('p', { 'class': 'small' }, ['Ton pseudo reste sur cet appareil. Tu le changes à tout moment en haut de la page.']),
        choisir
      ]));
      return;
    }
    chargerBrouillon();
    var lecture = Club.HEURES.every(function (h) { return passe(6, h); });
    zone.appendChild(el('p', { 'class': 'consigne' }, lecture
      ? ['Semaine passée : lecture seule.']
      : ['Touche une case pour passer de ', el('span', { 'class': 'temoin' }, ['vide']), ' à ', el('span', { 'class': 'temoin oui' }, ['dispo']),
        ' puis ', el('span', { 'class': 'temoin peut' }, ['peut-être']), '. Glisse le doigt ou la souris pour en remplir plusieurs. Touche un jour pour toute la soirée.']));
    if (aucune) zone.appendChild(el('p', { 'class': 'bandeau-info' }, ['Tu as indiqué que tu n\'es pas dispo cette semaine. Touche une case pour changer d\'avis.']));
    var g = grille({ label: 'Mes dispos de la semaine', cellule: celluleMoi });
    brancherPeinture(g);
    zone.appendChild(g);
    var premiere = g.querySelector('.case:not([disabled])');
    if (premiere) premiere.tabIndex = 0;

    if (!lecture) {
      var precedente = Club.disposSemaine(Club.cleSemaine(Club.decaler(semaineAffichee, -7)))[id];
      var copier = el('button', { type: 'button', 'class': 'bouton-contour', disabled: !(precedente && precedente.c && Object.keys(precedente.c).length) }, ['Copier la semaine dernière']);
      var pasDispo = el('button', { type: 'button', 'class': 'bouton-contour', 'aria-pressed': aucune ? 'true' : 'false' }, ['Pas dispo cette semaine']);
      var effacer = el('button', { type: 'button', 'class': 'bouton-texte' }, ['Tout effacer']);
      copier.addEventListener('click', function () {
        brouillon = {};
        Object.keys(precedente.c).forEach(function (k) {
          var p = k.split('-').map(Number);
          if (!passe(p[0], p[1])) brouillon[k] = precedente.c[k];
        });
        aucune = false;
        enregistrer();
        Club.annonce('Semaine dernière recopiée.');
      });
      pasDispo.addEventListener('click', function () {
        aucune = !aucune;
        if (aucune) brouillon = {};
        enregistrer();
      });
      effacer.addEventListener('click', function () {
        brouillon = {};
        aucune = false;
        enregistrer();
      });
      zone.appendChild(el('div', { 'class': 'raccourcis' }, [copier, pasDispo, effacer]));
    }
  }

  // Toucher puis glisser : toutes les cases survolées prennent la valeur de la première.
  function finPeinture() {
    if (!peinture) return;
    var change = peinture.change;
    peinture = null;
    if (change) enregistrer();
  }
  document.addEventListener('pointerup', finPeinture);
  document.addEventListener('pointercancel', finPeinture);

  function brancherPeinture(g) {
    g.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('button.case');
      if (!b || b.disabled || e.button !== 0) return;
      e.preventDefault();
      b.focus({ preventScroll: true });
      aucune = false;
      peinture = { valeur: SUIVANT[brouillon[b.getAttribute('data-case')] || ''], change: false };
      poser(b, peinture.valeur);
      peinture.change = true;
    });
    g.addEventListener('pointermove', function (e) {
      if (!peinture) return;
      var n = document.elementFromPoint(e.clientX, e.clientY);
      var b = n && n.closest ? n.closest('button.case') : null;
      if (!b || b.disabled || !g.contains(b)) return;
      if ((brouillon[b.getAttribute('data-case')] || '') !== peinture.valeur) poser(b, peinture.valeur);
    });
    // Clavier : Entrée ou Espace font tourner la case ; les flèches déplacent le focus dans la grille.
    g.addEventListener('click', function (e) {
      var jour = e.target.closest('button.jour');
      if (jour) {
        var j = Number(jour.getAttribute('data-jour'));
        var cases = Club.HEURES.filter(function (h) { return !passe(j, h); }).map(function (h) { return j + '-' + h; });
        var tout = cases.every(function (k) { return brouillon[k] === 'oui'; });
        aucune = false;
        cases.forEach(function (k) { if (tout) delete brouillon[k]; else brouillon[k] = 'oui'; });
        enregistrer();
        return;
      }
      var b = e.target.closest('button.case');
      if (!b || e.detail !== 0) return; // la souris et le doigt passent par pointerdown
      aucune = false;
      poser(b, SUIVANT[brouillon[b.getAttribute('data-case')] || '']);
      enregistrer();
    });
    g.addEventListener('keydown', function (e) {
      var b = e.target.closest('button.case');
      var pas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!b || !pas) return;
      e.preventDefault();
      var p = b.getAttribute('data-case').split('-').map(Number);
      var j = p[0], hi = Club.HEURES.indexOf(p[1]);
      for (var essai = 0; essai < 12; essai++) {
        j = Math.max(0, Math.min(6, j + pas[0]));
        hi = Math.max(0, Math.min(Club.HEURES.length - 1, hi + pas[1]));
        var cible = g.querySelector('[data-case="' + j + '-' + Club.HEURES[hi] + '"]');
        if (cible && !cible.disabled) {
          b.tabIndex = -1;
          cible.tabIndex = 0;
          cible.focus();
          return;
        }
      }
    });
  }

  // --- Vue équipe ---------------------------------------------------------------

  function rendreEquipe() {
    var zone = document.querySelector('[data-equipe]');
    Club.vider(zone);
    var creneaux = Club.creneaux(cle());
    var parCase = {};
    creneaux.forEach(function (c) { parCase[c.jour + '-' + c.heure] = c; });

    var a_venir = creneaux.filter(function (c) { return c.oui.length && !passe(c.jour, c.heure); }).sort(function (a, b) {
      return (b.oui.length - a.oui.length) || (b.peut.length - a.peut.length) || (a.jour - b.jour) || (a.heure - b.heure);
    });
    if (!creneauChoisi || !parCase[creneauChoisi]) creneauChoisi = a_venir.length ? a_venir[0].jour + '-' + a_venir[0].heure : null;

    zone.appendChild(el('p', { 'class': 'consigne' }, ['Le chiffre compte les joueurs dispos ; un cadre doré marque un créneau jouable, à ' + Club.MIN_JOUEURS + ' ou plus. Touche une case pour voir qui.']));
    var g = grille({
      equipe: true,
      label: 'Dispos de la team',
      cellule: function (j, h, k, matchs) {
        var c = parCase[k];
        var n = c.oui.length;
        var b = el('button', { type: 'button', role: 'gridcell', 'class': 'case' + (n >= Club.MIN_JOUEURS ? ' jouable' : '') + (n / Club.JOUEURS.length >= 0.55 ? ' fort' : '') +
          (matchs ? ' avec-match' : '') + (passe(j, h) ? ' passee' : ''),
          'data-creneau': k, style: '--part:' + (n / Club.JOUEURS.length).toFixed(2), 'aria-pressed': k === creneauChoisi ? 'true' : 'false',
          'aria-label': Club.JOURS[j] + ' ' + h + ' h : ' + Club.pluriel(n, 'dispo', 'dispos') + (c.peut.length ? ', ' + c.peut.length + ' peut-être' : '') }, [
          n ? el('span', { 'class': 'nombre' }, [String(n)]) : null,
          c.peut.length ? el('span', { 'class': 'peut-nombre' }, ['+' + c.peut.length]) : null,
          matchs ? el('span', { 'class': 'marque-match', title: 'vs ' + matchs[0].opponent }, [etiquetteMatch(matchs)]) : null
        ]);
        return b;
      }
    });
    g.addEventListener('click', function (e) {
      var b = e.target.closest('[data-creneau]');
      if (!b) return;
      creneauChoisi = b.getAttribute('data-creneau');
      g.querySelectorAll('[data-creneau]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      rendreDetail(parCase[creneauChoisi]);
    });
    zone.appendChild(g);
    zone.appendChild(el('div', { 'class': 'detail-creneau', 'data-detail': true, 'aria-live': 'polite' }, []));
    rendreDetail(creneauChoisi ? parCase[creneauChoisi] : null);

    zone.appendChild(el('p', { 'class': 'etiquette' }, ['Qui a rempli']));
    zone.appendChild(el('ul', { 'class': 'qui-a-rempli' }, Club.JOUEURS.map(function (p) {
      var e = Club.disposSemaine(cle())[p.id];
      var ok = Club.aRempli(cle(), p.id);
      return el('li', { 'class': ok ? 'ok' : '' }, [Club.avatar(p, 28), el('span', {}, [p.nom]),
        el('span', { 'class': 'small' }, [ok ? (e.aucune ? 'pas dispo' : 'rempli') : 'à remplir'])]);
    })));
  }

  function rendreDetail(c) {
    var zone = document.querySelector('[data-detail]');
    if (!zone) return;
    Club.vider(zone);
    if (!c) {
      zone.appendChild(el('p', { 'class': 'small' }, ['Personne n\'a encore indiqué de dispo pour cette semaine.']));
      return;
    }
    var nonRemplis = [], pasDispo = [];
    Club.JOUEURS.forEach(function (p) {
      if (c.oui.indexOf(p.id) >= 0 || c.peut.indexOf(p.id) >= 0) return;
      (Club.aRempli(cle(), p.id) ? pasDispo : nonRemplis).push(p.id);
    });
    function noms(ids) { return ids.length ? ids.map(function (id) { return Club.personne(id).nom; }).join(', ') : 'personne'; }
    var jour = Club.decaler(semaineAffichee, c.jour);
    zone.appendChild(el('p', { 'class': 'detail-titre' }, [Club.jourLong(jour) + ' · ' + c.heure + ' h',
      c.oui.length >= Club.MIN_JOUEURS ? el('span', { 'class': 'pastille-jouable' }, ['On peut jouer']) : null]));
    zone.appendChild(el('dl', {}, [
      el('dt', { 'class': 'oui' }, ['Dispo']), el('dd', {}, [noms(c.oui)]),
      el('dt', { 'class': 'peut' }, ['Peut-être']), el('dd', {}, [noms(c.peut)]),
      el('dt', {}, ['Pas dispo']), el('dd', {}, [noms(pasDispo)]),
      el('dt', {}, ['Pas encore rempli']), el('dd', {}, [noms(nonRemplis)])
    ]));
  }

  // --- Page -----------------------------------------------------------------------

  function rendre() {
    rendreEntete();
    rendreMesDispos();
    rendreEquipe();
  }

  document.querySelector('.semaine-nav').addEventListener('click', function (e) {
    var b = e.target.closest('[data-semaine]');
    if (!b) return;
    var d = Number(b.getAttribute('data-semaine'));
    var cible = d === 0 ? Club.lundi() : Club.decaler(semaineAffichee, 7 * d);
    if (Club.cleSemaine(cible) === cle()) return;
    var dir = cible > semaineAffichee ? 'droite' : 'gauche';
    window.cubeSurPlace(dir, function () {
      semaineAffichee = cible;
      creneauChoisi = null;
      rendre();
    });
  });

  // Données de la team : on redessine, sauf pendant qu'on peint (le geste en cours l'emporte).
  document.addEventListener('club-donnees', function () {
    if (peinture) return;
    var focus = document.activeElement && document.activeElement.getAttribute ? document.activeElement.getAttribute('data-case') : null;
    rendre();
    if (focus) {
      var b = document.querySelector('[data-case="' + focus + '"]');
      if (b) { b.tabIndex = 0; b.focus({ preventScroll: true }); }
    }
  });
  document.addEventListener('club-joueur', rendre);

  rendre();
})();
