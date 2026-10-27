// Transition « cube » (Edge et Chrome), reprise du e-learning : la page tourne comme la face d'un cube.
// Entre deux pages du site, et dans une même page quand on change de map ou de semaine.
// Chargé sans defer dans le <head> : la classe de direction doit être posée avant le premier rendu,
// moment où le navigateur lance la transition entre les deux pages (règles dans style.css).
(function () {
  var CLE = 'bober-club-cube';
  var DIRECTIONS = ['droite', 'gauche'];
  var racine = document.documentElement;
  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  function poser(dir) {
    racine.classList.add('cube-nav', 'cube-' + dir);
  }
  function retirer() {
    racine.classList.remove('cube-nav');
    DIRECTIONS.forEach(function (d) { racine.classList.remove('cube-' + d); });
  }
  function nomDe(href) {
    return String(href).split('#')[0].split('?')[0].split('/').pop() || 'index.html';
  }

  // Page d'arrivée : la page de départ a noté la direction et la cible juste avant de partir.
  var note = null;
  try {
    note = JSON.parse(sessionStorage.getItem(CLE) || 'null');
    sessionStorage.removeItem(CLE);
  } catch (e) { note = null; }
  if (note && note.cible === nomDe(location.pathname) && Date.now() - note.t < 8000 &&
      DIRECTIONS.indexOf(note.dir) >= 0) {
    poser(note.dir);
    if ('onpagereveal' in window) {
      window.addEventListener('pagereveal', function (e) {
        if (e.viewTransition) e.viewTransition.finished.then(retirer, retirer);
        else retirer();
      }, { once: true });
    } else {
      // Navigateur sans transition entre pages (Firefox) : rien à animer.
      retirer();
    }
  }

  // Page de départ : appelée juste avant de quitter la page.
  window.cubeTransition = function (dir, href) {
    if (DIRECTIONS.indexOf(dir) < 0) return;
    try {
      sessionStorage.setItem(CLE, JSON.stringify({ dir: dir, cible: nomDe(href), t: Date.now() }));
    } catch (e) { return; }
    retirer();
    poser(dir);
  };

  // Même page : maj() change le contenu pendant que le cube tourne. Sans l'API, le contenu change seul.
  window.cubeSurPlace = function (dir, maj) {
    if (DIRECTIONS.indexOf(dir) < 0 || !document.startViewTransition || mouvementReduit.matches) {
      maj();
      return;
    }
    retirer();
    poser(dir);
    var t = document.startViewTransition(maj);
    t.finished.then(retirer, retirer);
  };

  // Retour par le cache du navigateur : la page revient telle qu'on l'a quittée, classe comprise.
  window.addEventListener('pageshow', function (e) { if (e.persisted) retirer(); });
})();
