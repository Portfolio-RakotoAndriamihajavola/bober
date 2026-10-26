# BOBER Académie

Parcours d'apprentissage du playbook Valorant de la team, construit sur le modèle du e-learning Revit MEP (dossier Drive « 05 - Formation e-learning_02 ») :

- **Accueil en héros** : carrousel courbé des modules (glisser, élan, clavier), notes manuscrites, bouton « Continuer ».
- **Modules en chapitres** : contexte, objectif, compétences à valider, cours, exercice en pracc (PDCA) avec journal et voie (accélérée, standard, renforcée).
- **Accès séquentiel** : un module s'ouvre quand toutes les cases du précédent sont cochées. Le complément « Pool d'agents » reste ouvert.
- **Progression locale** : cases, journaux, voies et pseudo restent dans le navigateur de chaque joueur (`localStorage`, clé `bober-academie-v1`).

Le contenu vient du site d'équipe (séquences Lotus et Split, roster, agents, calendrier) et du guide PDF Lotus. Les images sont celles de la racine du dépôt, appelées en `../`.

## Lancer

Depuis la racine du dépôt : `npm start`, puis ouvrir `http://localhost:3000/academie/`. Les pages sont statiques : elles marchent aussi sur n'importe quel hébergement de fichiers.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil : héros, carrousel, parcours, roster, maps à venir, méthode |
| `m00` à `m05`, `c01` | Un fichier par module |
| `css/style.css` | Thème (jetons de couleur en tête de fichier) et mises en page |
| `js/progress.js` | Liste des modules, progression, frise, plan, validation, journaux |
| `js/carrousel.js` | Carrousel courbé de l'accueil |
| `js/cube.js` | Transition « cube » entre deux modules (Chrome et Edge) |

## Ajouter une map

1. Copier `m03-split.html` en `m0X-nom.html`, puis remplacer les séquences et les cases. Chaque case porte une clé unique : `data-key="m0X-c1-a"`.
2. Ajouter le module dans `MODULES` (`js/progress.js`) avec son nombre de cases dans `criteres`. La console signale un écart entre ce nombre et la page.
3. Ajouter sa carte dans le carrousel et sa ligne dans « Le parcours » (`index.html`), et retirer la map de « À venir ».
