// Carrousel courbé de l'accueil, repris du e-learning (modèle « Reelmark »).
// Les cartes des maps défilent sur l'intérieur d'un cylindre, se lancent au glisser,
// et s'ouvrent au clic : la carte se déploie en en-tête de la page des strats de la map.
// Chargé en fin de page, sans « defer », après accueil.js qui crée les cartes :
// elles sont placées avant le premier affichage.
(function () {
  var rangee = document.querySelector('.rangee');
  if (!rangee) return;

  var liste = rangee.querySelector('.cartes');
  var originales = Array.prototype.slice.call(liste.querySelectorAll('.carte'));
  var PAS = 196; // écart entre deux cartes, en unités de cadre
  var VITESSE = 50; // défilement automatique, unités par seconde, de droite à gauche
  var COINS = 15; // rayon des coins, en unités
  var LEVEE = 12; // soulèvement d'une carte survolée, en unités
  var SEUIL_GLISSER = 6; // en pixels : au-delà, c'est un glisser et non un clic
  var RUBAN_MIN = 2100; // longueur minimale du ruban, en unités, pour qu'il couvre tout le cylindre

  // Peu de cartes : on double la rangée pour que le ruban fasse le tour sans trou.
  // Les copies sont décoratives : hors de l'arbre d'accessibilité et hors du parcours au clavier.
  var copies = 0;
  while ((originales.length * (copies + 1)) * PAS < RUBAN_MIN && copies < 4) {
    copies++;
    originales.forEach(function (carte) {
      var copie = carte.cloneNode(true);
      copie.setAttribute('aria-hidden', 'true');
      copie.classList.add('copie');
      copie.querySelectorAll('a').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
      liste.appendChild(copie);
    });
  }

  var cartes = Array.prototype.slice.call(liste.querySelectorAll('.carte'));
  var N = cartes.length;
  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  var telephone = window.matchMedia('(max-width: 820px)');

  rangee.classList.add('carrousel-actif');

  // pathLength = 1 : chaque trait se dessine avec stroke-dasharray: 1.
  document.querySelectorAll('.picto *, .trait').forEach(function (n) {
    n.setAttribute('pathLength', '1');
  });

  var decalage = 0; // position du ruban, en unités ; il croît avec le temps
  var elan = 0; // vitesse ajoutée par un lancer, en unités par seconde
  var glisse = null; // glisser en cours
  var empecherClic = false;
  var survol = -1; // indice de la carte survolée, ou -1
  var cible = null; // décalage visé (focus clavier, centrage de la map du prochain match)
  var facteurAuto = 1; // 1 : défilement normal ; 0 : arrêt (survol, focus)
  var interagi = false;
  var levees = cartes.map(function () { return 0; });
  var m = mesurer();

  // --- Géométrie --------------------------------------------------------------

  // Unité, centre et rayon de normalisation. Bureau : cadre de 1440 unités.
  // Téléphone : bande de 250 px à l'échelle de 640 unités.
  function mesurer() {
    var u, largeur, centreY;
    if (telephone.matches) {
      var r = rangee.getBoundingClientRect();
      largeur = 640;
      u = r.width / largeur;
      centreY = (rangee.clientHeight / u) / 2;
    } else {
      var cadre = rangee.closest('.cadre-heros');
      largeur = 1440;
      u = cadre.clientWidth / largeur;
      // 687 : centre vertical des cartes dans le cadre ; la rangée commence à offsetTop.
      centreY = 687 - rangee.offsetTop / u;
    }
    return { u: u || 1, C: largeur / 2, R: (largeur / 2) * 706 / 720, centreY: centreY };
  }

  function f(n) { return n.toFixed(1); }

  // Quadrilatère aux coins arrondis, pour clip-path: path().
  function chemin(p, r) {
    var s = '';
    for (var i = 0; i < 4; i++) {
      var a = p[(i + 3) % 4], b = p[i], c = p[(i + 1) % 4];
      var la = Math.hypot(a[0] - b[0], a[1] - b[1]);
      var lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      var ra = Math.min(r, la / 2), rc = Math.min(r, lc / 2);
      var d1 = [b[0] + (a[0] - b[0]) / la * ra, b[1] + (a[1] - b[1]) / la * ra];
      var d2 = [b[0] + (c[0] - b[0]) / lc * rc, b[1] + (c[1] - b[1]) / lc * rc];
      s += (i === 0 ? 'M' : 'L') + f(d1[0]) + ' ' + f(d1[1]) +
        'Q' + f(b[0]) + ' ' + f(b[1]) + ' ' + f(d2[0]) + ' ' + f(d2[1]);
    }
    return s + 'Z';
  }

  // Écart au centre, avant poussée, de la carte i, ramené dans [-L/2, L/2).
  function ecart(i) {
    var L = N * PAS;
    var t = i * PAS - decalage;
    t = ((t % L) + L) % L;
    if (t >= L / 2) t -= L;
    return t;
  }

  // Place et découpe chaque carte selon sa position, comme sur l'intérieur d'un cylindre.
  function placer() {
    var u = m.u;
    cartes.forEach(function (carte, i) {
      var t = ecart(i);
      var x = m.C + t * (1 + 0.083 * Math.pow(t / m.R, 2));
      var d = Math.abs(x - m.C) / m.R;
      // Hors champ : la carte n'est pas dessinée.
      if (d > 1.45) {
        carte.style.visibility = 'hidden';
        return;
      }
      carte.style.visibility = '';
      var w = 170 + 48 * d * d;
      var xg = x - w / 2, xd = x + w / 2;
      var hg = 280 + 92 * Math.pow(Math.abs(xg - m.C) / m.R, 2.6);
      var hd = 280 + 92 * Math.pow(Math.abs(xd - m.C) / m.R, 2.6);
      var yc = m.centreY - 12 * d * d - levees[i];
      var hMax = Math.max(hg, hd);
      var haut = yc - hMax / 2;
      var W = w * u, H = hMax * u;
      var p = [
        [0, (yc - hg / 2 - haut) * u],
        [W, (yc - hd / 2 - haut) * u],
        [W, (yc + hd / 2 - haut) * u],
        [0, (yc + hg / 2 - haut) * u]
      ];
      carte.style.width = f(W) + 'px';
      carte.style.height = f(H) + 'px';
      carte.style.transform = 'translate(' + f(xg * u) + 'px,' + f(haut * u) + 'px)';
      carte.style.clipPath = 'path("' + chemin(p, COINS * u) + '")';
      // Zone sûre du contenu : entre les bords les plus courts, en haut et en bas.
      carte.style.setProperty('--haut', f(Math.max(p[0][1], p[1][1])) + 'px');
      carte.style.setProperty('--bas', f(H - Math.min(p[2][1], p[3][1])) + 'px');
    });
  }

  // --- Horloge et mouvement ---------------------------------------------------

  // Horloge Web Animations de longue durée : le défilement dépend du temps, pas des images.
  var horloge = (typeof Animation === 'function' && typeof KeyframeEffect === 'function')
    ? new Animation(new KeyframeEffect(null, [], { duration: 1e9 }), document.timeline)
    : null;
  if (horloge) horloge.play();
  function maintenant() {
    return horloge ? (horloge.currentTime || 0) : performance.now();
  }
  var dernier = maintenant();
  var enMarche = false;

  function image() {
    if (!enMarche) return;
    var t = maintenant();
    var dt = Math.min(0.1, Math.max(0, (t - dernier) / 1000));
    dernier = t;

    // Seul un focus clavier arrête le défilement : un clic de souris donne aussi le focus au lien.
    var actif = document.activeElement;
    var focusDedans = rangee.contains(actif) && clavier(actif);
    var arret = mouvementReduit.matches || survol >= 0 || focusDedans;
    facteurAuto += ((arret ? 0 : 1) - facteurAuto) * Math.min(1, dt * 4);

    if (!glisse) {
      if (cible !== null) {
        var reste = cible - decalage;
        decalage += reste * Math.min(1, dt * 6);
        if (Math.abs(reste) < 0.5) { decalage = cible; cible = null; }
      } else {
        decalage += (VITESSE * facteurAuto + elan) * dt;
        // L'élan perd environ 95 % de sa vitesse par seconde.
        elan *= Math.pow(0.05, dt);
        if (Math.abs(elan) < 0.5) elan = 0;
      }
    }

    cartes.forEach(function (carte, i) {
      var vise = (i === survol && !glisse && !mouvementReduit.matches) ? LEVEE : 0;
      levees[i] += (vise - levees[i]) * Math.min(1, dt * 10);
    });

    placer();
    prochaineImage = requestAnimationFrame(image);
  }

  var prochaineImage = 0;
  function demarrer() {
    if (enMarche) return;
    enMarche = true;
    dernier = maintenant();
    cancelAnimationFrame(prochaineImage);
    prochaineImage = requestAnimationFrame(image);
  }

  // Le carrousel s'arrête quand l'accueil n'est plus à l'écran.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entrees) {
      if (entrees[0].isIntersecting) demarrer();
      else enMarche = false;
    }).observe(rangee);
  } else {
    demarrer();
  }

  // Décalage qui amène la carte i au centre, au plus près de la position actuelle.
  function decalagePour(i) {
    var L = N * PAS;
    return i * PAS + Math.round((decalage - i * PAS) / L) * L;
  }

  function centrer(i, immediat) {
    if (i < 0) return;
    if (immediat || mouvementReduit.matches) {
      decalage = decalagePour(i);
      cible = null;
    } else {
      cible = decalagePour(i);
    }
    elan = 0;
  }

  // --- Glisser avec élan ------------------------------------------------------

  rangee.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    glisse = { id: e.pointerId, x0: e.clientX, depart: decalage, actif: false, points: [{ x: e.clientX, t: e.timeStamp }] };
    elan = 0;
    cible = null;
  });

  rangee.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') {
      var carte = e.target.closest ? e.target.closest('.carte') : null;
      survol = carte ? cartes.indexOf(carte) : -1;
    }
    if (!glisse || e.pointerId !== glisse.id) return;
    var dx = e.clientX - glisse.x0;
    if (!glisse.actif && Math.abs(dx) > SEUIL_GLISSER) {
      // La capture ne commence qu'au-delà du seuil : un simple clic reste un clic sur le lien.
      glisse.actif = true;
      interagi = true;
      survol = -1;
      rangee.setPointerCapture(e.pointerId);
      rangee.classList.add('en-glisse');
    }
    if (glisse.actif) {
      decalage = glisse.depart - dx / m.u;
      glisse.points.push({ x: e.clientX, t: e.timeStamp });
      while (glisse.points.length > 2 && e.timeStamp - glisse.points[0].t > 100) glisse.points.shift();
    }
  });

  function finGlisse(e) {
    if (!glisse || e.pointerId !== glisse.id) return;
    if (glisse.actif) {
      var pts = glisse.points, a = pts[0], b = pts[pts.length - 1];
      var duree = (b.t - a.t) / 1000;
      if (duree > 0) elan = Math.max(-3000, Math.min(3000, -((b.x - a.x) / m.u) / duree));
      // Le clic qui suit le relâchement ne doit pas ouvrir de map.
      empecherClic = true;
      setTimeout(function () { empecherClic = false; }, 0);
    }
    rangee.classList.remove('en-glisse');
    glisse = null;
  }
  rangee.addEventListener('pointerup', finGlisse);
  rangee.addEventListener('pointercancel', finGlisse);
  rangee.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') survol = -1;
  });
  rangee.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // Clic : annulé après un glisser ; sinon la carte se déploie en en-tête de la page de la map.
  rangee.addEventListener('click', function (e) {
    if (empecherClic) {
      e.preventDefault();
      e.stopPropagation();
      empecherClic = false;
      return;
    }
    var carte = e.target.closest ? e.target.closest('.carte') : null;
    if (!carte) return;
    cartes.forEach(function (c) { c.style.viewTransitionName = ''; });
    carte.style.viewTransitionName = 'map-hero';
  }, true);

  // --- Clavier ----------------------------------------------------------------

  // Le focus ramène la carte au centre ; le défilement s'arrête tant que le focus est dedans.
  function clavier(el) {
    try { return el.matches(':focus-visible'); } catch (err) { return true; }
  }

  rangee.addEventListener('focusin', function (e) {
    if (glisse || !clavier(e.target)) return;
    var carte = e.target.closest ? e.target.closest('.carte') : null;
    if (!carte) return;
    interagi = true;
    centrer(cartes.indexOf(carte));
  });

  // Flèches gauche et droite : carte précédente ou suivante (parmi les originales).
  rangee.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var carte = e.target.closest ? e.target.closest('.carte') : null;
    if (!carte) return;
    var pas = e.key === 'ArrowRight' ? 1 : -1;
    var n = originales.length;
    var i = originales.indexOf(carte);
    for (var k = 1; k < n; k++) {
      var voisine = originales[((i + pas * k) % n + n) % n];
      var lien = voisine.querySelector('.carte-lien[href]');
      if (lien) {
        e.preventDefault();
        // Une carte hors champ est masquée, donc impossible à focaliser : on la rend visible,
        // le focus la ramène ensuite au centre (focusin).
        voisine.style.visibility = '';
        lien.focus({ preventScroll: true });
        return;
      }
    }
  });

  // --- Mesures, map du prochain match, retour depuis une map --------------------

  window.addEventListener('resize', function () { m = mesurer(); placer(); });
  if (telephone.addEventListener) telephone.addEventListener('change', function () { m = mesurer(); placer(); });

  // Retour depuis la page des strats : la carte de la dernière map ouverte revient au centre
  // et la transition se joue à l'envers (l'en-tête se replie en carte).
  function indexDe(mapId) {
    for (var i = 0; i < originales.length; i++) {
      if (originales[i].getAttribute('data-carte') === mapId) return i;
    }
    return -1;
  }
  var retour = -1;
  try {
    var depuis = document.referrer ? new URL(document.referrer) : null;
    if (depuis && depuis.origin === location.origin && /strats\.html$/.test(depuis.pathname)) {
      retour = indexDe(sessionStorage.getItem('boberClubDerniereMap'));
    }
  } catch (err) { retour = -1; }

  if (retour >= 0) {
    centrer(retour, true);
    interagi = true;
  } else {
    var prochaine = liste.querySelector('.carte.prochain:not(.copie)');
    if (prochaine) centrer(cartes.indexOf(prochaine), true);
  }

  window.addEventListener('pagereveal', function (e) {
    // Arrivée par le cube depuis une autre section : toute la page tourne, pas de carte qui se replie.
    if (!e.viewTransition || retour < 0 || document.documentElement.classList.contains('cube-nav')) return;
    var carte = cartes[retour];
    carte.style.viewTransitionName = 'map-hero';
    e.viewTransition.finished.then(function () { carte.style.viewTransitionName = ''; });
  });
  // Retour par le cache du navigateur : aucun nom de transition ne doit rester posé.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) cartes.forEach(function (c) { c.style.viewTransitionName = ''; });
  });

  // Données arrivées après l'ouverture (accueil.js) : on amène la map du prochain match au centre.
  document.addEventListener('cartes-pretes', function () {
    if (interagi) return;
    var prochaine = liste.querySelector('.carte.prochain:not(.copie)');
    if (prochaine) centrer(cartes.indexOf(prochaine));
  });

  // --- Entrée ---------------------------------------------------------------

  function entree() {
    if (mouvementReduit.matches || retour >= 0 || !document.body.animate) return;
    var douce = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
    function jouer(el, images, duree, delai) {
      if (!el) return;
      el.animate(images, { duration: duree, delay: delai, easing: douce, fill: 'backwards' });
    }
    jouer(document.querySelector('.barre'), [
      { transform: 'translateY(-28px)', opacity: 0 }, { transform: 'none', opacity: 1 }
    ], 650, 0);
    jouer(document.querySelector('.badge'), [
      { transform: 'scale(0.6)', opacity: 0 },
      { transform: 'scale(1.06)', opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 }
    ], 550, 200);
    document.querySelectorAll('.titre-heros .ligne').forEach(function (ligne, i) {
      jouer(ligne, [
        { transform: 'translateY(42px)', filter: 'blur(14px)', opacity: 0 },
        { transform: 'none', filter: 'blur(0)', opacity: 1 }
      ], 850, 330 + i * 130);
    });
    jouer(document.querySelector('.sous-titre'), [
      { transform: 'translateY(18px)', opacity: 0 }, { transform: 'none', opacity: 1 }
    ], 700, 680);
    jouer(rangee, [
      { transform: 'translateY(90px)', opacity: 0 }, { transform: 'none', opacity: 1 }
    ], 1000, 800);
    jouer(document.querySelector('.anneau'), [
      { transform: 'scale(0.5)', opacity: 0 }, { transform: 'none', opacity: 1 }
    ], 650, 1150);
    document.querySelectorAll('.trait').forEach(function (trait, i) {
      jouer(trait, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 650, 1400 + i * 160);
    });
    document.querySelectorAll('.note').forEach(function (note, i) {
      jouer(note, [{ opacity: 0 }, { opacity: 1 }], 600, 1550 + i * 200);
    });
  }

  placer();
  entree();
})();
