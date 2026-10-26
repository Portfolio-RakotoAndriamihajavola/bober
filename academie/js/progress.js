// Suivi de progression local (localStorage) et interface de cours de la BOBER Académie.
// Repris du e-learning : accès séquentiel, frise, compétences, plan, validation, journal de l'Act.
// Si le stockage est indisponible, la page reste utilisable : rien n'est simplement mémorisé.
(function () {
  var STORE_KEY = 'bober-academie-v1';

  // Une seule liste des modules : sert à la frise, au plan, au carrousel et à l'accueil.
  // « criteres » : nombre de cases à cocher de la page, codé ici pour que l'accueil affiche
  // la progression sans ouvrir chaque module (une alerte en console signale un écart).
  var MODULES = [
    { id: 'm00', court: 'Diagnostic', titre: 'Diagnostic du joueur', duree: '20 min', criteres: 5, href: 'm00-diagnostic.html' },
    { id: 'm01', court: 'La team', titre: 'La team et les calls', duree: '30 min', criteres: 4, href: 'm01-equipe.html' },
    { id: 'm02', court: 'Lotus', titre: 'Lotus : attaque et défense', duree: '1 h', criteres: 7, href: 'm02-lotus.html' },
    { id: 'm03', court: 'Split', titre: 'Split : attaque et défense', duree: '1 h 30', criteres: 7, href: 'm03-split.html' },
    { id: 'm04', court: 'Matchs et REX', titre: 'Matchs, review et REX', duree: '45 min', criteres: 6, href: 'm04-matchs-rex.html' },
    { id: 'm05', court: 'Validation', titre: 'Validation : prêt pour l\'offi', duree: '30 min', criteres: 8, href: 'm05-validation.html' }
  ];

  // Modules complémentaires : ouverts tout de suite, hors du verrouillage, de la frise et du total.
  var COMPLEMENTAIRES = [
    { id: 'c01', court: 'Pool d\'agents', titre: 'Pool d\'agents de la team', duree: '20 min', criteres: 5, href: 'c01-pool-agents.html' }
  ];

  var JOUEURS = ['BOBE', 'Limulesama', 'h1mmel', 'Quentin', 'Warinen', 'Pinelancien', 'kørraZé'];

  function trouver(id) {
    var tous = MODULES.concat(COMPLEMENTAIRES);
    for (var i = 0; i < tous.length; i++) {
      if (tous[i].id === id) return tous[i];
    }
    return null;
  }

  function estComplementaire(id) {
    return COMPLEMENTAIRES.some(function (m) { return m.id === id; });
  }

  function load() {
    try {
      var lu = JSON.parse(localStorage.getItem(STORE_KEY));
      return lu && typeof lu === 'object' && !Array.isArray(lu) ? lu : {};
    } catch (e) {
      return {};
    }
  }

  var state = load();

  function save(cle, valeur) {
    state[cle] = valeur;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* stockage bloqué (navigation privée) : on continue sans sauvegarde */
    }
  }

  // Petit utilitaire : crée un élément avec ses attributs et ses enfants (texte ou éléments).
  // Le texte passe par createTextNode : il n'est jamais interprété comme du HTML.
  function el(balise, attributs, enfants) {
    var n = document.createElement(balise);
    Object.keys(attributs || {}).forEach(function (a) { n.setAttribute(a, attributs[a]); });
    (enfants || []).forEach(function (c) {
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  // Petit rebond quand une coche apparaît. La classe est retirée à la fin pour pouvoir le rejouer.
  function rebond(noeud) {
    if (!noeud) return;
    noeud.classList.remove('rebond');
    void noeud.offsetWidth;
    noeud.classList.add('rebond');
    noeud.addEventListener('animationend', function fin() {
      noeud.classList.remove('rebond');
      noeud.removeEventListener('animationend', fin);
    });
  }

  function vider(noeud) {
    while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
  }

  function pageCourante() {
    var nom = window.location.pathname.split('/').pop() || 'index.html';
    var tous = MODULES.concat(COMPLEMENTAIRES);
    for (var i = 0; i < tous.length; i++) {
      if (nom === tous[i].href) return tous[i].id;
    }
    return null;
  }

  function faitsModule(id) {
    var faits = 0;
    Object.keys(state).forEach(function (cle) {
      if (cle.indexOf(id + '-') === 0 && state[cle] === true) faits++;
    });
    return faits;
  }

  // Statut d'un module : fait si toutes les cases connues sont cochées.
  function statutModule(id) {
    var m = trouver(id);
    var total = m ? m.criteres : 0;
    var faits = faitsModule(id);
    if (total > 0 && faits >= total) return 'fait';
    if (faits > 0) return 'en-cours';
    return 'a-venir';
  }

  // Accès séquentiel : un module s'ouvre quand le précédent est entièrement fait.
  function accessible(id) {
    for (var i = 0; i < MODULES.length; i++) {
      if (MODULES[i].id !== id) continue;
      if (i === 0) return true;
      return statutModule(MODULES[i - 1].id) === 'fait';
    }
    return true;
  }

  function numero(m) {
    var i = MODULES.indexOf(m);
    return i >= 0 ? String(i) : 'C' + (COMPLEMENTAIRES.indexOf(m) + 1);
  }

  // --- Pages de module ----------------------------------------------------------

  function construireEntete() {
    var head = el('header', { 'class': 'course-head' }, []);
    var titre = el('span', { 'class': 'titre' }, [
      el('a', { 'class': 'logo-mini', href: 'index.html' }, [
        el('img', { src: '../Logo%20bober%20H.png', alt: 'Accueil de la BOBER Académie', width: '42', height: '42' }, [])
      ]),
      el('span', {}, ['BOBER Académie'])
    ]);
    var actions = el('span', { 'class': 'actions' }, [
      el('a', { 'class': 'sommaire-lien', href: '../index.html' }, ['Site d\'équipe']),
      el('a', { 'class': 'sommaire-lien', href: 'index.html' }, ['Sommaire']),
      el('a', { 'class': 'cta', id: 'continuer', href: 'index.html' }, ['Continuer le module'])
    ]);
    head.appendChild(titre);
    head.appendChild(actions);
    return head;
  }

  function construireFrise() {
    var courant = pageCourante();
    var wrap = el('div', { 'class': 'frise-wrap' }, []);
    var ol = el('ol', { 'class': 'frise', 'aria-label': 'Étapes du parcours' }, []);
    MODULES.forEach(function (m, i) {
      var statut = statutModule(m.id);
      if (m.id === courant && statut !== 'fait') statut = 'en-cours';
      var li = el('li', { 'class': statut }, []);
      // Rang du module : décale l'animation d'entrée de chaque segment (cascade).
      li.style.setProperty('--i', i);
      var ouvert = accessible(m.id);
      var attrs = ouvert ? { href: m.href } : { 'class': 'bloque', 'aria-disabled': 'true' };
      if (m.id === courant) attrs['aria-current'] = 'page';
      li.appendChild(el(ouvert ? 'a' : 'span', attrs, [
        el('span', { 'class': 'noeud' }, [String(i)]),
        el('span', { 'class': 'frise-label' }, [m.court]),
        el('span', { 'class': 'frise-duree' }, [m.duree])
      ]));
      ol.appendChild(li);
    });
    wrap.appendChild(ol);
    return wrap;
  }

  function rafraichirFrise() {
    var ancienne = document.querySelector('.frise-wrap');
    if (ancienne) ancienne.replaceWith(construireFrise());
  }

  // Plan à jour après chaque case : pastilles, compteur et modules débloqués.
  function rafraichirSommaire() {
    var ancien = document.querySelector('.sommaire');
    if (!ancien) return;
    var nouveau = construireSommaire(pageCourante());
    // Pas de nouvelle entrée animée : le plan est seulement remplacé.
    nouveau.style.animation = 'none';
    var defilement = ancien.scrollTop;
    ancien.replaceWith(nouveau);
    nouveau.scrollTop = defilement;
  }

  // Bande de compétences : une puce par case de la page, verte si acquise.
  function construireCompetences() {
    var boites = document.querySelectorAll('input[type="checkbox"][data-key]');
    if (!boites.length) return null;
    var bande = el('div', { 'class': 'competences' }, [
      el('p', { 'class': 'etiquette' }, ['Compétences de ce module'])
    ]);
    var chips = el('div', { 'class': 'chips' }, []);
    boites.forEach(function (box) {
      var label = box.closest('label');
      var texte = label ? label.textContent.trim() : box.getAttribute('data-key');
      chips.appendChild(el('span', { 'class': 'chip', 'data-chip-for': box.getAttribute('data-key') }, [texte]));
    });
    bande.appendChild(chips);
    return bande;
  }

  function rafraichirChips() {
    document.querySelectorAll('[data-chip-for]').forEach(function (chip) {
      chip.classList.toggle('acquis', state[chip.getAttribute('data-chip-for')] === true);
    });
  }

  // Plan à gauche : les modules du parcours, puis les complémentaires ; chapitres du module ouvert.
  function construireSommaire(courant) {
    var aside = el('aside', { 'class': 'sommaire', 'aria-label': 'Plan du parcours' }, []);
    var termines = 0;
    MODULES.forEach(function (m) { if (statutModule(m.id) === 'fait') termines++; });
    var rang = MODULES.findIndex(function (m) { return m.id === courant; });
    aside.appendChild(el('p', { 'class': 'etiquette' }, [
      (rang >= 0 ? 'Module ' + rang + ' sur ' + (MODULES.length - 1) + ' · ' : '') +
      termines + ' terminé(s)'
    ]));

    function ligne(m) {
      var statut = statutModule(m.id);
      if (m.id === courant && statut !== 'fait') statut = 'en-cours';
      var li = el('li', {}, []);
      var ouvert = accessible(m.id);
      var attrs = { 'class': 'bloque', 'aria-disabled': 'true' };
      if (ouvert) {
        attrs = { href: m.href };
        if (m.id === courant) attrs['aria-current'] = 'true';
      }
      li.appendChild(el(ouvert ? 'a' : 'span', attrs, [el('span', { 'class': 'dot ' + statut }, []), m.court]));
      if (m.id === courant) {
        var sous = el('ul', { 'class': 'sous' }, []);
        document.querySelectorAll('main h2[id]').forEach(function (h) {
          sous.appendChild(el('li', {}, [el('a', { href: '#' + h.id }, [h.textContent])]));
        });
        li.appendChild(sous);
      }
      return li;
    }

    var plan = el('ul', { 'class': 'plan' }, []);
    MODULES.forEach(function (m) { plan.appendChild(ligne(m)); });
    aside.appendChild(plan);
    aside.appendChild(el('p', { 'class': 'etiquette sep' }, ['Complémentaire']));
    var comp = el('ul', { 'class': 'plan' }, []);
    COMPLEMENTAIRES.forEach(function (m) { comp.appendChild(ligne(m)); });
    aside.appendChild(comp);
    return aside;
  }

  // Validation du module : automatique quand toutes les cases sont cochées.
  // La date de validation est enregistrée une seule fois.
  function rendreValidation() {
    var carte = document.getElementById('validation');
    if (!carte) return;
    var id = carte.getAttribute('data-module');
    var m = trouver(id);
    if (!m) return;
    var complementaire = estComplementaire(id);
    var suivant = complementaire ? null : MODULES[MODULES.indexOf(m) + 1];
    var cle = 'valide-' + id;
    var fait = statutModule(id) === 'fait';
    if (fait && !state[cle]) {
      var auj = new Date();
      save(cle, auj.getFullYear() + '-' + String(auj.getMonth() + 1).padStart(2, '0') + '-' + String(auj.getDate()).padStart(2, '0'));
    }
    vider(carte);
    if (fait) {
      carte.className = 'card validation ok';
      carte.appendChild(el('p', { 'class': 'block-title' }, ['Module validé']));
      var date = String(state[cle] || '');
      var texte = ['Toutes les cases de ce module sont cochées.'];
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        var d = date.split('-');
        texte = ['Toutes les cases de ce module sont cochées. Validé le ', el('strong', {}, [d[2] + '/' + d[1] + '/' + d[0]]), '.'];
      }
      carte.appendChild(el('p', {}, texte));
      if (complementaire) {
        carte.appendChild(el('p', {}, [el('a', { 'class': 'cta', href: 'index.html' }, ['Retour à l\'accueil'])]));
      } else if (suivant) {
        carte.appendChild(el('p', {}, [el('a', { 'class': 'cta', href: suivant.href }, ['Module suivant : ' + suivant.titre])]));
      } else {
        carte.appendChild(el('p', {}, ['C\'est le dernier module du parcours. GG, tu es prêt pour l\'offi.']));
      }
    } else {
      carte.className = 'card validation';
      carte.appendChild(el('p', { 'class': 'block-title' }, ['Validation du module']));
      carte.appendChild(el('p', {}, [
        'Le module est validé quand toutes les cases sont cochées : ',
        el('strong', {}, [Math.min(m.criteres, faitsModule(id)) + ' / ' + m.criteres]),
        complementaire ? '. Ce module complémentaire ne bloque pas le parcours.' : '. Le module suivant s\'ouvre alors.'
      ]));
    }
  }

  // Bouton « Continuer » : pointe vers le chapitre de la première case non cochée.
  function rafraichirContinuer() {
    var bouton = document.getElementById('continuer');
    if (!bouton) return;
    var boites = document.querySelectorAll('input[type="checkbox"][data-key]');
    var prochaine = null;
    for (var i = 0; i < boites.length; i++) {
      if (!boites[i].checked) { prochaine = boites[i]; break; }
    }
    if (!boites.length || !prochaine) {
      var courant = trouver(pageCourante());
      var suivant = courant && !estComplementaire(courant.id) ? MODULES[MODULES.indexOf(courant) + 1] : null;
      bouton.href = suivant && accessible(suivant.id) ? suivant.href : 'index.html';
      bouton.textContent = suivant && accessible(suivant.id) ? 'Module suivant' : 'Retour au sommaire';
      return;
    }
    var chapitre = null;
    document.querySelectorAll('main h2[id]').forEach(function (h) {
      if (h.compareDocumentPosition(prochaine) & Node.DOCUMENT_POSITION_FOLLOWING) chapitre = h;
    });
    bouton.href = chapitre ? '#' + chapitre.id : '#';
    bouton.textContent = 'Continuer le module';
  }

  // Journal de l'Act : une zone de texte sous le paragraphe « Act. » de chaque carte PDCA.
  function construireJournaux() {
    document.querySelectorAll('.card.pdca').forEach(function (carte) {
      var voies = carte.querySelector('[data-rythme]');
      if (!voies) return;
      var chapitre = voies.getAttribute('data-rythme');
      var act = null;
      carte.querySelectorAll(':scope > p').forEach(function (p) {
        var fort = p.querySelector('strong');
        if (fort && fort.textContent.trim() === 'Act.') act = p;
      });
      if (!act) return;
      var question = act.textContent.replace(/^\s*Act\.\s*/, '').replace(/^Journal\s*:\s*/, '').trim();
      var zone = el('textarea', {
        'data-journal': chapitre, rows: '3', spellcheck: 'true',
        placeholder: 'Ta réponse : ce qui a bloqué, ce que tu as corrigé, ce que tu retiens pour le prochain match.',
        'aria-label': 'Journal du chapitre : ' + question
      }, []);
      act.parentNode.insertBefore(el('div', { 'class': 'journal' }, [zone]), act.nextSibling);
    });
  }

  // Visionneuse : une image de séquence s'ouvre en grand, avec sa légende.
  function construireVisionneuse() {
    var images = document.querySelectorAll('.sequence img');
    if (!images.length || typeof HTMLDialogElement !== 'function') return;
    var image = el('img', { alt: '' }, []);
    var legende = el('span', {}, []);
    var fermer = el('button', { type: 'button' }, ['Fermer']);
    var dialogue = el('dialog', { 'class': 'visionneuse', 'aria-label': 'Image en grand' }, [
      image, el('div', { 'class': 'pied' }, [legende, fermer])
    ]);
    document.body.appendChild(dialogue);
    fermer.addEventListener('click', function () { dialogue.close(); });
    // Clic sur le fond : on ferme.
    dialogue.addEventListener('click', function (e) { if (e.target === dialogue) dialogue.close(); });
    images.forEach(function (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      function ouvrir() {
        image.src = img.currentSrc || img.src;
        image.alt = img.alt;
        var fig = img.closest('figure');
        var cap = fig ? fig.querySelector('figcaption') : null;
        legende.textContent = cap ? cap.textContent.trim() : img.alt;
        dialogue.showModal();
      }
      img.addEventListener('click', ouvrir);
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); }
      });
    });
  }

  // Sens de la transition « cube » vers un autre module : droite vers la suite, gauche vers l'arrière.
  function sensVers(courant, href) {
    var nom = String(href || '').split('#')[0].split('?')[0].split('/').pop();
    if (!nom) return null;
    var suite = MODULES.concat(COMPLEMENTAIRES);
    var de = -1, vers = -1;
    suite.forEach(function (m, i) {
      if (m.id === courant) de = i;
      if (m.href === nom) vers = i;
    });
    if (de < 0 || vers < 0 || de === vers) return null;
    return vers > de ? 'droite' : 'gauche';
  }

  // --- Accueil ------------------------------------------------------------------

  function rafraichirBarres() {
    document.querySelectorAll('[data-module-bar]').forEach(function (bar) {
      var id = bar.getAttribute('data-module-bar');
      var m = trouver(id);
      var total = m ? m.criteres : 0;
      var faits = Math.min(total, faitsModule(id));
      var pct = total ? Math.round((faits / total) * 100) : 0;
      var fill = bar.querySelector('span');
      if (fill) fill.style.transform = 'scaleX(' + (pct / 100) + ')';
    });
    document.querySelectorAll('[data-module-label]').forEach(function (label) {
      var id = label.getAttribute('data-module-label');
      var m = trouver(id);
      var total = m ? m.criteres : 0;
      var faits = Math.min(total, faitsModule(id));
      var pct = total ? Math.round((faits / total) * 100) : 0;
      // Cartes du carrousel : libellé court, pour tenir dans la largeur d'une carte.
      label.textContent = label.classList.contains('carte-etat')
        ? faits + ' / ' + total + ' · ' + pct + ' %'
        : faits + ' / ' + total + ' compétences (' + pct + ' %)';
    });

    var toutes = 0;
    var fait = 0;
    MODULES.forEach(function (m) {
      toutes += m.criteres;
      fait += Math.min(m.criteres, faitsModule(m.id));
    });
    var pctGlobal = toutes ? Math.round((fait / toutes) * 100) : 0;
    var globalFill = document.querySelector('[data-global-bar] span');
    if (globalFill) globalFill.style.transform = 'scaleX(' + (pctGlobal / 100) + ')';
    var globalLabel = document.querySelector('[data-global-label]');
    if (globalLabel) globalLabel.textContent = pctGlobal + ' % du parcours validé';

    rafraichirAccueil(pctGlobal);
    rendreValidation();
  }

  // Accueil : titre « Bon retour », état, bouton « Continuer », statut des cartes.
  function rafraichirAccueil(pctGlobal) {
    var titre = document.querySelector('[data-accueil-titre]');
    if (!titre) return;
    var joueur = JOUEURS.indexOf(state.joueur) >= 0 ? state.joueur : '';
    titre.textContent = joueur ? 'Bon retour, ' + joueur : 'Bienvenue chez BOBER';

    var enCours = 0;
    var prochain = null;
    MODULES.concat(COMPLEMENTAIRES).forEach(function (m) {
      var statut = statutModule(m.id);
      if (statut === 'en-cours') enCours++;
      var comp = estComplementaire(m.id);
      if (!comp && !prochain && statut !== 'fait') prochain = m;
      var ouvert = accessible(m.id);
      if (!ouvert) statut = 'verrouille';
      // Toutes les cartes du module, copies du carrousel comprises.
      document.querySelectorAll('[data-carte="' + m.id + '"]').forEach(function (carte) {
        carte.setAttribute('data-statut', statut);
        var lien = carte.querySelector('.module-lien');
        // Module verrouillé : plus de lien, donc plus de clic ni de Entrée au clavier.
        if (lien) {
          if (ouvert) lien.setAttribute('href', m.href);
          else lien.removeAttribute('href');
        }
      });
      document.querySelectorAll('[data-liste="' + m.id + '"]').forEach(function (li) {
        li.setAttribute('data-statut', statut);
        var etat = li.querySelector('.etat-module');
        if (etat) {
          etat.textContent = (statut === 'verrouille' ? 'Verrouillé · ' : statut === 'fait' ? 'Validé · ' : '') +
            Math.min(m.criteres, faitsModule(m.id)) + ' / ' + m.criteres + ' compétences · ' + m.duree;
        }
        var lien = li.querySelector('a');
        if (lien) {
          if (ouvert) lien.setAttribute('href', m.href);
          else lien.removeAttribute('href');
        }
      });
    });

    var etat = document.querySelector('[data-accueil-etat]');
    if (etat) etat.textContent = enCours + ' en cours · ' + pctGlobal + ' % validé';

    var dejaCommence = Object.keys(state).some(function (cle) { return state[cle] === true; });
    var bouton = document.querySelector('[data-accueil-continuer]');
    if (bouton) {
      if (!prochain) {
        bouton.href = MODULES[MODULES.length - 1].href;
        bouton.textContent = 'Parcours terminé';
      } else {
        bouton.href = prochain.href;
        // Nom court : le bouton du héros doit tenir dans son anneau.
        bouton.textContent = dejaCommence ? 'Continuer : ' + prochain.court : 'Commencer le parcours';
      }
    }
    var reprendre = document.querySelector('[data-accueil-reprendre]');
    if (reprendre) reprendre.href = prochain ? prochain.href : MODULES[MODULES.length - 1].href;
    // Le carrousel met en avant la carte du prochain module.
    document.querySelectorAll('[data-carte]').forEach(function (carte) {
      carte.classList.toggle('prochain', !!prochain && carte.getAttribute('data-carte') === prochain.id);
    });
  }

  function brancherJoueur() {
    var choix = document.querySelector('[data-joueur]');
    if (!choix) return;
    JOUEURS.forEach(function (nom) {
      choix.appendChild(el('option', { value: nom }, [nom]));
    });
    if (JOUEURS.indexOf(state.joueur) >= 0) choix.value = state.joueur;
    choix.addEventListener('change', function () {
      save('joueur', choix.value);
      rafraichirBarres();
    });
  }

  // --- Mise en page d'un module ---------------------------------------------------

  function initialiserModule() {
    var corps = document.body;
    var courant = pageCourante();
    var ancienneNav = document.querySelector('nav.top');
    if (ancienneNav) ancienneNav.remove();

    var contenu = el('main', { 'class': 'contenu', id: 'contenu' }, []);
    while (corps.firstChild) contenu.appendChild(corps.firstChild);

    // En-tête et frise dans un même bloc collant : ils restent visibles au défilement.
    var bandeau = el('div', { 'class': 'bandeau' }, [construireEntete(), construireFrise()]);
    bandeau.querySelector('.frise-wrap').classList.add('entree');
    corps.appendChild(bandeau);
    var suivreBandeau = function () {
      document.documentElement.style.setProperty('--haut-bandeau', bandeau.offsetHeight + 'px');
    };
    suivreBandeau();
    if (window.ResizeObserver) new ResizeObserver(suivreBandeau).observe(bandeau);

    var verrouillee = !!courant && !accessible(courant);
    var bande = verrouillee ? null : construireCompetences();
    if (bande) corps.appendChild(bande);
    // Le contenu entre d'abord dans la page : le plan y lit les chapitres (h2) du module.
    var colonnes = el('div', { 'class': 'corps' }, [contenu]);
    corps.appendChild(colonnes);
    colonnes.insertBefore(construireSommaire(courant), contenu);

    // Page d'un module verrouillé (ouverte directement) : on remplace le contenu par un message.
    if (verrouillee) {
      var m = trouver(courant);
      var precedent = MODULES[MODULES.indexOf(m) - 1];
      var titre = contenu.querySelector('h1');
      vider(contenu);
      if (titre) contenu.appendChild(titre);
      contenu.appendChild(el('div', { 'class': 'card ctx' }, [
        el('p', { 'class': 'block-title' }, ['Module verrouillé']),
        el('p', {}, [
          'Ce module s\'ouvre quand le précédent est terminé. Coche toutes les cases de ',
          el('a', { href: precedent.href }, [precedent.titre]),
          ' pour y accéder.'
        ])
      ]));
      return;
    }

    if (courant) {
      contenu.appendChild(el('div', { id: 'validation', 'data-module': courant }, []));
      // Contrôle de cohérence : le nombre de cases codé dans MODULES doit suivre la page.
      var m2 = trouver(courant);
      var n = document.querySelectorAll('input[type="checkbox"][data-key]').length;
      if (m2 && n !== m2.criteres && window.console) {
        console.warn('BOBER Académie : ' + courant + ' compte ' + n + ' cases, MODULES en annonce ' + m2.criteres + '.');
      }
    }

    construireJournaux();
    construireVisionneuse();

    // Blocs « Compétences à valider » : style d'objectifs.
    document.querySelectorAll('.block-title').forEach(function (t) {
      if (/^compétences/i.test(t.textContent.trim()) && t.closest('.card')) t.closest('.card').classList.add('objectifs');
    });

    document.querySelectorAll('input[type="checkbox"][data-key]').forEach(function (box) {
      var key = box.getAttribute('data-key');
      box.checked = state[key] === true;
      box.addEventListener('change', function () {
        save(key, box.checked);
        rafraichirChips();
        rafraichirBarres();
        rafraichirFrise();
        rafraichirSommaire();
        rafraichirContinuer();
        if (box.checked) {
          rebond(box);
          rebond(document.querySelector('[data-chip-for="' + key + '"]'));
        }
      });
    });

    document.querySelectorAll('textarea[data-journal]').forEach(function (zone) {
      var key = 'journal-' + zone.getAttribute('data-journal');
      if (typeof state[key] === 'string') zone.value = state[key];
      var minuterie = null;
      zone.addEventListener('input', function () {
        clearTimeout(minuterie);
        minuterie = setTimeout(function () { save(key, zone.value); }, 400);
      });
      zone.addEventListener('blur', function () { clearTimeout(minuterie); save(key, zone.value); });
    });

    document.querySelectorAll('input[type="radio"][data-rythme]').forEach(function (radio) {
      var key = 'voie-' + radio.getAttribute('data-rythme');
      if (state[key] === radio.value) radio.checked = true;
      radio.addEventListener('change', function () { save(key, radio.value); });
    });

    // Lien vers un autre module (frise, plan, « module suivant ») : la page tourne en cube.
    if (courant) {
      document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        var lien = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!lien || lien.target === '_blank') return;
        var sens = sensVers(courant, lien.getAttribute('href'));
        if (sens && window.cubeTransition) window.cubeTransition(sens, lien.getAttribute('href'));
      });
    }

    // Bandeau compact en descendant ; deux seuils (80 et 20 px) évitent le clignotement.
    window.addEventListener('scroll', function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      var reduit = bandeau.classList.contains('reduit');
      if (!reduit && y > 80) bandeau.classList.add('reduit');
      else if (reduit && y < 20) bandeau.classList.remove('reduit');
    }, { passive: true });

    rafraichirChips();
    rafraichirBarres();
    rafraichirContinuer();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-page') === 'accueil') {
      brancherJoueur();
      rafraichirBarres();
      document.dispatchEvent(new CustomEvent('progression-prete'));
    } else {
      initialiserModule();
    }

    // Réinitialisation (accueil) : efface les cases, journaux et voies, garde le joueur choisi.
    document.addEventListener('click', function (e) {
      var bouton = e.target && e.target.closest ? e.target.closest('[data-reinitialiser]') : null;
      if (!bouton) return;
      if (!window.confirm('Effacer toute ta progression (cases, journaux et voies) ?')) return;
      var joueur = state.joueur;
      Object.keys(state).forEach(function (cle) { delete state[cle]; });
      try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
      if (joueur) save('joueur', joueur);
      window.location.reload();
    });
  });
})();
