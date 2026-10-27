// Données du club : maps, roster, agents, strats du playbook, et stockage partagé avec la team.
// Le partage passe par la même fonction Supabase que l'ancien site (app.js, syncSettings) :
// GET renvoie { version, data: { clé: valeur } } et POST { key, value } enregistre une clé.
// Chaque navigateur garde une copie locale : sans réseau, le site marche sur cet appareil.
(function () {
  var Club = window.Club = {};

  // --- Référentiel ------------------------------------------------------------

  Club.MAPS = [
    { id: 'abyss', nom: 'Abyss', image: 'Abyss.webp', sites: ['A', 'B'] },
    { id: 'ascent', nom: 'Ascent', image: 'Ascent.webp', sites: ['A', 'B'] },
    { id: 'bind', nom: 'Bind', image: 'Bind.webp', sites: ['A', 'B'] },
    { id: 'breeze', nom: 'Breeze', image: 'Breeze.webp', sites: ['A', 'B'] },
    { id: 'fracture', nom: 'Fracture', image: 'Fracture.webp', sites: ['A', 'B'] },
    { id: 'haven', nom: 'Haven', image: 'Haven.webp', sites: ['A', 'B', 'C'] },
    { id: 'icebox', nom: 'Icebox', image: 'Icebox.webp', sites: ['A', 'B'] },
    { id: 'lotus', nom: 'Lotus', image: 'Lotus.webp', sites: ['A', 'B', 'C'], guide: 'LOTUS BOBER GUIDE.pdf' },
    { id: 'pearl', nom: 'Pearl', image: 'Pearl.webp', sites: ['A', 'B'] },
    { id: 'split', nom: 'Split', image: 'Split.webp', sites: ['A', 'B'] },
    { id: 'sunset', nom: 'Sunset', image: 'Sunset.webp', sites: ['A', 'B'] }
  ];

  // Zones en plus des sites : le mid, et « Global » pour un setup ou un principe de toute la map.
  Club.ZONES_EN_PLUS = ['Mid', 'Global'];

  // Rôle de chaque agent ; une icône existe dans ../agent/ pour ceux marqués d'un i.
  var AGENTS = [
    ['Astra', 'smoke', 1], ['Breach', 'init', 1], ['Brimstone', 'smoke', 1], ['Chamber', 'sent', 1],
    ['Clove', 'smoke', 1], ['Cypher', 'sent', 1], ['Deadlock', 'sent', 1], ['Fade', 'init', 1],
    ['Gekko', 'init', 1], ['Harbor', 'smoke', 0], ['Iso', 'duel', 0], ['Jett', 'duel', 1],
    ['KAY/O', 'init', 0], ['Killjoy', 'sent', 1], ['Neon', 'duel', 1], ['Omen', 'smoke', 1],
    ['Phoenix', 'duel', 0], ['Raze', 'duel', 0], ['Reyna', 'duel', 0], ['Sage', 'sent', 0],
    ['Skye', 'init', 0], ['Sova', 'init', 0], ['Tejo', 'init', 0], ['Viper', 'smoke', 1],
    ['Vyse', 'sent', 0], ['Waylay', 'duel', 1], ['Yoru', 'duel', 0]
  ];
  Club.AGENTS = AGENTS.map(function (a) {
    return { nom: a[0], role: a[1], icone: a[2] ? '../agent/' + a[0].toLowerCase() + '.png' : '' };
  });
  Club.ROLES = { duel: 'Dueliste', init: 'Initiateur', smoke: 'Smokeur', sent: 'Sentinelle' };
  Club.agent = function (nom) {
    for (var i = 0; i < Club.AGENTS.length; i++) {
      if (Club.AGENTS[i].nom.toLowerCase() === String(nom).toLowerCase()) return Club.AGENTS[i];
    }
    return { nom: nom, role: '', icone: '' };
  };

  // Roster de l'ancien site (app.js, teamProfilesData). Les identifiants sont ceux des comptes.
  Club.JOUEURS = [
    { id: 'bobe', nom: 'BOBE', role: 'Propriétaire · flex initiateur smokeur', photo: '../pdp_bobe.png',
      agents: ['Sova', 'Skye', 'Tejo', 'Fade', 'Astra'] },
    { id: 'limulesama', nom: 'Limulesama', role: 'Capitaine · dueliste', photo: '../pdp_limule.jpg',
      agents: ['Waylay', 'Raze', 'Jett', 'Phoenix'] },
    { id: 'h1mmel', nom: 'h1mmel', role: 'IGL · flex smokeur sentinelle', photo: '../pdp_h1mmel.png',
      agents: ['Viper', 'Omen', 'Deadlock', 'Vyse', 'Killjoy'] },
    { id: 'quentin', nom: 'Quentin', role: 'Shot caller · flex initiateur smokeur', photo: '../pdp_quentin.jpg',
      agents: ['Astra', 'Gekko', 'Omen'] },
    { id: 'warinen', nom: 'Warinen', role: 'Flex initiateur smokeur', photo: '../pdp_warinen.jpg',
      agents: ['Brimstone', 'Fade', 'Chamber', 'Phoenix'] },
    { id: 'pinelancien', nom: 'Pinelancien', role: 'Flex initiateur smokeur · sentinelle', photo: '../pdp_pinelancien.png',
      agents: ['Breach', 'Viper', 'Omen', 'Cypher'] },
    { id: 'korraze', nom: 'kørraZé', role: 'Flex dueliste smokeur', photo: '../pdp_korraz%C3%A9.webp',
      agents: ['Jett', 'Neon', 'Omen'] }
  ];
  // Le coach peut signer une strat ; il ne compte pas dans les dispos des joueurs.
  Club.STAFF = [{ id: 'coach', nom: 'Coach', role: 'Coach', photo: '', agents: [] }];

  Club.personne = function (id) {
    var tous = Club.JOUEURS.concat(Club.STAFF);
    for (var i = 0; i < tous.length; i++) if (tous[i].id === id) return tous[i];
    return null;
  };

  // --- Strats du playbook (séquences de l'ancien site et guide PDF Lotus) --------
  // Modifiables comme les autres : une version enregistrée sous le même identifiant les remplace.

  function img(nom) { return '../' + encodeURI(nom); }
  Club.STRATS_PLAYBOOK = [
    { id: 'lotus-hit-a', map: 'lotus', cote: 'attaque', site: 'A', titre: 'Hit A après le fight main',
      quand: ['Open kill sur le fight main (avec l\'avantage numérique : freeze)', 'Danger aperçu en C', 'Défense passive sur site'],
      agents: ['Viper'],
      etapes: [
        { texte: 'Écran toxique de la Viper (E) pour couper la vue, la team se place pour le fight main.', image: img('HIT A - 1.png') },
        { texte: 'Nuage de poison de la Viper (Q) pour entrer sur le site A.', image: img('HIT A - 2.png') }
      ] },
    { id: 'lotus-hit-b', map: 'lotus', cote: 'attaque', site: 'B', titre: 'Hit B ou redirection B',
      quand: ['Sentinelle sur un des deux sites', 'Kill hobbit', 'Manque de temps'],
      agents: ['Viper', 'Killjoy'],
      etapes: [
        { texte: 'Écran toxique de la Viper sur le B et essaim de nanites de la Killjoy (C).', image: img('HIT B - 1.png') }
      ],
      notes: 'Le B sert aussi de redirection quand A et C sont fermés.' },
    { id: 'lotus-hit-c', map: 'lotus', cote: 'attaque', site: 'C', titre: 'Hit C',
      quand: ['Au pistol round', 'Si on fait reculer le Chamber (ou la Jett)'],
      agents: ['Viper', 'Killjoy'],
      etapes: [
        { texte: 'Écran toxique de la Viper (E) vers le C.', image: img('HIT C - 1.png') },
        { texte: 'Prise du C main avec le dog, et une flash si besoin. Puis flash bend, grenade backsite et dog à gauche pour entrer sur le site. Tourelle de la Killjoy (E).', image: img('HIT C - 2.png') }
      ],
      notes: 'Killjoy : elle reste main pour punir ceux qui traversent au bruit de la porte.' },
    { id: 'lotus-def-fort-a', map: 'lotus', cote: 'defense', site: 'A', titre: 'Setup fort en A',
      quand: ['Fort en A, 2 en B, faible en C', 'Rota fast sur les infos', 'Un joueur reste dans la zone gagnée pour l\'info d\'une late-rota'],
      agents: [],
      etapes: [{ texte: 'Fort en A, 2 en B, faible en C. Fast rota sur les infos.', image: img('Defense A.png') }],
      notes: 'Principe Lotus : on joue la map en diagonale. Soit fort en A, soit fort en C, et toujours neutre en B.' },
    { id: 'lotus-def-fort-c', map: 'lotus', cote: 'defense', site: 'C', titre: 'Setup fort en C',
      quand: ['Pour changer de lecture après des rounds en fort A', 'Rota fast sur les infos'],
      agents: [],
      etapes: [{ texte: 'La variante prévue par le principe : fort en C, neutre en B.', image: img('Defense C.png') }],
      notes: 'Principe Lotus : on joue la map en diagonale. Soit fort en A, soit fort en C, et toujours neutre en B.' },
    { id: 'split-hit-a-rampe', map: 'split', cote: 'attaque', site: 'A', titre: 'Hit A rampe',
      quand: ['Se lit à la pression sur la rampe', 'Étape 4 : on tient ou on redirige en B'],
      agents: ['Viper', 'Omen', 'Skye', 'Fade', 'Waylay'],
      etapes: [
        { texte: 'Dog de la Fade.', image: img('split - hit A - 1.png') },
        { texte: 'Flash de la Skye, flash de l\'Omen et dash de la Waylay.', image: img('split - hit A - 2.png') },
        { texte: 'Avancée sur la rampe, la Skye surveille les arrières.', image: img('split - hit A - 3.png') },
        { texte: 'Décision : tenir, ou rediriger en B.', image: img('split - hit A - 4.png') },
        { texte: 'Deuxième flash de la Skye et reveal de la Fade.', image: img('split - hit A - 5.png') }
      ],
      notes: 'Viper : poison wall en A en routine, puis sprint en B pour contrôler le B main tout de suite.\nOmen : contrôle aussi le mid après la flash.' },
    { id: 'split-hit-b', map: 'split', cote: 'attaque', site: 'B', titre: 'Hit B par le mid et la tower',
      quand: ['Mid pris avec la smoke de l\'Omen et la flash de la Skye'],
      agents: ['Viper', 'Omen', 'Skye', 'Fade', 'Waylay'],
      etapes: [
        { texte: 'Smoke de l\'Omen et flash de la Skye pour prendre le mid, dog de la Fade pour contrôler le garage.', image: img('split - hit B - 1.png') },
        { texte: 'Smoke et flash de l\'Omen, dash de la Waylay pour prendre la tower.', image: img('split - hit B - 2.png') },
        { texte: 'La Viper part vers la rampe pendant la prise du B main avec l\'Omen et la Fade.', image: img('split - hit B - 3.png') },
        { texte: 'Flood du site avec le reveal et la flash de la Skye.', image: img('split - hit B - 4.png') }
      ],
      notes: 'Viper : contrôle A main, puis infiltration pour permettre une rota ou un lurk.' },
    { id: 'split-def-fort-a', map: 'split', cote: 'defense', site: 'A', titre: 'Setup fort en A',
      quand: ['On push des zones et on joue les rota fast spawn', 'Retake A par la rampe et le screen', 'Retake B par la tower et le garage'],
      agents: [],
      etapes: [{ texte: 'Setup fort en A.', image: img('split - defense fort en A.png') }] },
    { id: 'split-def-fort-b', map: 'split', cote: 'defense', site: 'B', titre: 'Setup fort en B',
      quand: ['On push des zones et on joue les rota fast spawn', 'Retake B par la tower et le garage', 'Retake A par la rampe et le screen'],
      agents: [],
      etapes: [{ texte: 'Setup fort en B.', image: img('split - defense fort en B.png') }] }
  ].map(function (s) {
    s.auteur = 'playbook';
    s.maj = s.map === 'lotus' ? '2026-03-31T12:00:00.000Z' : '2026-03-18T12:00:00.000Z';
    s.notes = s.notes || '';
    s.video = '';
    return s;
  });

  // --- Stockage local ---------------------------------------------------------

  Club.CLES = {
    strats: 'boberClubStrats',     // { id: strat } ; { id, supprime: true } efface une strat du playbook
    dispos: 'boberClubDispos',     // { 'AAAA-MM-JJ' (lundi): { joueur: { c: { 'jour-heure': 'oui'|'peut' }, aucune, maj } } }
    avenir: 'boberUpcomingMatches', // partagé avec l'ancien site : [{ opponent, datetime, map, type, id }]
    joues: 'boberPlayedMatches'     // partagé avec l'ancien site : [{ opponent, date, map, type, elo, score, ... }]
  };
  var PARTAGEES = Object.keys(Club.CLES).map(function (k) { return Club.CLES[k]; });
  var DEFAUTS = {};
  DEFAUTS[Club.CLES.strats] = {};
  DEFAUTS[Club.CLES.dispos] = {};
  DEFAUTS[Club.CLES.avenir] = [];
  DEFAUTS[Club.CLES.joues] = [];

  function copie(v) { return JSON.parse(JSON.stringify(v)); }

  Club.lire = function (cle) {
    var defaut = DEFAUTS[cle];
    try {
      var brut = localStorage.getItem(cle);
      if (!brut) return copie(defaut);
      var v = JSON.parse(brut);
      // Même forme que la valeur par défaut (tableau ou objet), sinon on repart de zéro.
      if (Array.isArray(defaut) !== Array.isArray(v) || !v || typeof v !== 'object') return copie(defaut);
      return v;
    } catch (e) {
      return copie(defaut);
    }
  };
  function ecrire(cle, v) {
    try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* stockage plein ou bloqué */ }
  }

  // --- Partage avec la team ---------------------------------------------------

  var SYNC = {
    url: 'https://gaauvofzcibtwzytapjs.supabase.co/functions/v1/sync',
    // Clé publique « anon » de l'ancien site : elle identifie le projet, elle ne protège rien.
    cleApi: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYXV2b2Z6Y2lidHd6eXRhcGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTkyMzksImV4cCI6MjA5MTMzNTIzOX0.MK5vDic5VsjC7LM8nmeTmNUd-zbQf64BO54qyJ_D47o',
    intervalle: 5000,
    delai: 6000
  };

  var version = 0;
  var etat = 'connexion'; // connexion, en-ligne, envoi, hors-ligne, partiel
  var enAttente = []; // gestes pas encore acceptés par le serveur : { cle, fn }
  var verrou = null;
  // Clés que le serveur refuse (sa liste de clés autorisées ne les connaît pas encore) :
  // elles restent sur cet appareil, et on ne les renvoie plus jusqu'au prochain chargement.
  var refusees = {};

  function annoncer() { document.dispatchEvent(new CustomEvent('club-donnees')); }
  function changerEtat(e) {
    if (e === 'en-ligne' && Object.keys(refusees).length) e = 'partiel';
    if (etat === e) return;
    etat = e;
    document.dispatchEvent(new CustomEvent('club-sync', { detail: e }));
  }
  Club.etatSync = function () { return etat; };
  Club.clesRefusees = function () { return Object.keys(refusees); };

  function entetes(extra) {
    var h = { apikey: SYNC.cleApi, Authorization: 'Bearer ' + SYNC.cleApi };
    Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  function requete(options) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var minuterie = ctrl ? setTimeout(function () { ctrl.abort(); }, SYNC.delai) : 0;
    if (ctrl) options.signal = ctrl.signal;
    return fetch(SYNC.url, options).finally(function () { clearTimeout(minuterie); });
  }

  function appliquer(op) {
    var v = Club.lire(op.cle);
    var r = op.fn(v);
    ecrire(op.cle, r === undefined ? v : r);
  }

  // Données de la team : on remplace la copie locale, puis on rejoue par-dessus nos gestes en attente.
  async function tirer() {
    try {
      var rep = await requete({ method: 'GET', headers: entetes({ Accept: 'application/json' }) });
      if (!rep.ok) { changerEtat('hors-ligne'); return false; }
      var p = await rep.json();
      var v = p && typeof p.version === 'number' ? p.version : 0;
      if (v > version) {
        version = v;
        var data = (p && p.data) || {};
        PARTAGEES.forEach(function (cle) {
          // Une clé refusée garde la version de cet appareil, plus récente que celle du serveur.
          if (!refusees[cle] && Object.prototype.hasOwnProperty.call(data, cle)) ecrire(cle, data[cle]);
        });
        enAttente.forEach(appliquer);
        annoncer();
      }
      if (!enAttente.length) changerEtat('en-ligne');
      return true;
    } catch (e) {
      changerEtat('hors-ligne');
      return false;
    }
  }

  // Réponse : 'ok', 'refuse' (le serveur répond mais n'accepte pas la clé) ou 'reseau'.
  async function pousser(cle) {
    try {
      var rep = await requete({
        method: 'POST',
        headers: entetes({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key: cle, value: Club.lire(cle) })
      });
      if (rep.status === 400 || rep.status === 413 || rep.status === 422) return 'refuse';
      if (!rep.ok) return 'reseau';
      var p = await rep.json().catch(function () { return null; });
      if (p && typeof p.version === 'number') version = Math.max(version, p.version);
      return 'ok';
    } catch (e) {
      return 'reseau';
    }
  }

  // Envoie les gestes en attente : données fraîches d'abord, pour ne pas écraser ceux des autres.
  function synchroniser() {
    if (verrou) return verrou;
    verrou = (async function () {
      try {
        while (enAttente.length) {
          changerEtat('envoi');
          if (!(await tirer())) { changerEtat('hors-ligne'); return; }
          var lot = enAttente.slice();
          var cles = [];
          lot.forEach(function (op) { if (cles.indexOf(op.cle) < 0 && !refusees[op.cle]) cles.push(op.cle); });
          for (var i = 0; i < cles.length; i++) {
            var r = await pousser(cles[i]);
            if (r === 'reseau') { changerEtat('hors-ligne'); return; }
            if (r === 'refuse') refusees[cles[i]] = true;
          }
          enAttente = enAttente.slice(lot.length);
        }
        changerEtat('en-ligne');
      } finally {
        verrou = null;
      }
    })();
    return verrou;
  }

  // Modifie une clé partagée. fn reçoit la valeur et la change (ou en renvoie une nouvelle) ;
  // elle doit pouvoir être rejouée sur des données plus récentes, donc décrire le résultat voulu
  // (« ma ligne vaut ceci ») plutôt qu'un changement relatif (« inverse ma case »).
  Club.modifier = function (cle, fn) {
    var op = { cle: cle, fn: fn };
    appliquer(op);
    if (!refusees[cle]) enAttente.push(op);
    annoncer();
    return synchroniser();
  };

  // Taille d'une valeur une fois envoyée, en octets (le serveur limite la taille d'un envoi).
  Club.taille = function (valeur) {
    var s = JSON.stringify(valeur);
    return typeof Blob === 'function' ? new Blob([s]).size : s.length;
  };
  Club.TAILLE_MAX = 900 * 1024;

  function sonder() {
    if (document.visibilityState === 'hidden' || verrou) return;
    tirer().then(function (ok) { if (ok && enAttente.length) synchroniser(); });
  }
  setInterval(sonder, SYNC.intervalle);
  document.addEventListener('visibilitychange', sonder);
  window.addEventListener('online', sonder);
  sonder();

  // --- Qui est sur le site ----------------------------------------------------

  var CLE_JOUEUR = 'boberClubJoueur';
  Club.joueur = function () {
    try {
      var id = localStorage.getItem(CLE_JOUEUR);
      if (id && Club.personne(id)) return id;
      // Connecté sur l'ancien site : on reprend son pseudo.
      var ancien = String(localStorage.getItem('boberPlayerSession') || '').trim().toLowerCase();
      if (ancien && Club.personne(ancien)) return ancien;
    } catch (e) { /* stockage bloqué */ }
    return '';
  };
  Club.choisirJoueur = function (id) {
    try { localStorage.setItem(CLE_JOUEUR, id); } catch (e) { /* stockage bloqué */ }
    document.dispatchEvent(new CustomEvent('club-joueur', { detail: id }));
  };

  // --- Strats -----------------------------------------------------------------

  Club.strats = function () {
    var enregistrees = Club.lire(Club.CLES.strats);
    var vues = {};
    var liste = [];
    Club.STRATS_PLAYBOOK.forEach(function (s) {
      vues[s.id] = true;
      var e = enregistrees[s.id];
      if (e && e.supprime) return;
      liste.push(e && e.titre ? e : s);
    });
    Object.keys(enregistrees).forEach(function (id) {
      var e = enregistrees[id];
      if (vues[id] || !e || e.supprime || !e.titre) return;
      liste.push(e);
    });
    var ordreCote = { attaque: 0, defense: 1 };
    return liste.sort(function (a, b) {
      return (ordreCote[a.cote] - ordreCote[b.cote]) ||
        String(a.site).localeCompare(String(b.site)) ||
        String(a.titre).localeCompare(String(b.titre), 'fr');
    });
  };
  Club.stratsDe = function (mapId) {
    return Club.strats().filter(function (s) { return s.map === mapId; });
  };
  Club.map = function (id) {
    for (var i = 0; i < Club.MAPS.length; i++) if (Club.MAPS[i].id === id) return Club.MAPS[i];
    return null;
  };
  // Reconnaît « Lotus », « lotus » ou « LOTUS » (les matchs de l'ancien site stockent le nom).
  Club.mapDepuis = function (texte) {
    var t = String(texte || '').trim().toLowerCase();
    for (var i = 0; i < Club.MAPS.length; i++) {
      if (Club.MAPS[i].id === t || Club.MAPS[i].nom.toLowerCase() === t) return Club.MAPS[i];
    }
    return null;
  };

  // --- Dates et dispos --------------------------------------------------------

  Club.JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  Club.HEURES = [18, 19, 20, 21, 22, 23];
  Club.MIN_JOUEURS = 5;

  Club.lundi = function (date) {
    var d = new Date(date || Date.now());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  };
  function deux(n) { return (n < 10 ? '0' : '') + n; }
  Club.cleSemaine = function (lundi) {
    return lundi.getFullYear() + '-' + deux(lundi.getMonth() + 1) + '-' + deux(lundi.getDate());
  };
  Club.depuisCle = function (cle) {
    var p = String(cle).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };
  Club.decaler = function (date, jours) {
    var d = new Date(date);
    d.setDate(d.getDate() + jours);
    return d;
  };

  // Dispos d'une semaine : { joueur: { c, aucune, maj } }.
  Club.disposSemaine = function (cleSemaine) {
    var tout = Club.lire(Club.CLES.dispos);
    var s = tout[cleSemaine];
    return s && typeof s === 'object' ? s : {};
  };

  // Compte, pour chaque créneau, qui est dispo et qui l'est peut-être.
  Club.creneaux = function (cleSemaine) {
    var s = Club.disposSemaine(cleSemaine);
    var res = [];
    for (var j = 0; j < 7; j++) {
      Club.HEURES.forEach(function (h) {
        var c = { jour: j, heure: h, oui: [], peut: [] };
        Club.JOUEURS.forEach(function (p) {
          var e = s[p.id];
          var v = e && e.c ? e.c[j + '-' + h] : '';
          if (v === 'oui') c.oui.push(p.id);
          else if (v === 'peut') c.peut.push(p.id);
        });
        res.push(c);
      });
    }
    return res;
  };
  Club.aRempli = function (cleSemaine, id) {
    var e = Club.disposSemaine(cleSemaine)[id];
    return !!(e && (e.aucune || (e.c && Object.keys(e.c).length)));
  };

  // --- Matchs -----------------------------------------------------------------

  Club.matchsAVenir = function () {
    var limite = Date.now() - 3 * 3600 * 1000;
    return Club.lire(Club.CLES.avenir).filter(function (m) {
      var t = new Date(m.datetime).getTime();
      return m && m.opponent && !isNaN(t) && t >= limite;
    }).sort(function (a, b) { return new Date(a.datetime) - new Date(b.datetime); });
  };

  Club.idMatch = function (m) {
    return m.id || (String(m.opponent) + '|' + String(m.datetime || m.date) + '|' + String(m.map || ''));
  };
  Club.nouvelId = function (prefixe) {
    return prefixe + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  };
})();
