# Site du club BOBER #WIPR

Le QG de la team : les strats par map, les dispos de la semaine et les matchs.
Site statique (HTML, CSS, JS sans outil de build), servi depuis `club/` à côté de l'ancien site.

## Pages

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil : carrousel des maps, semaine de la team, prochains matchs, dernières strats, roster |
| `strats.html` | Bibliothèque de strats par map, filtrable par côté, site et recherche ; ajout et modification |
| `dispos.html` | Grille de dispos à peindre (18 h à minuit, du lundi au dimanche) et vue de toute la team |
| `matchs.html` | Matchs à venir et résultats, dans le même format que l'ancien site |

## Lancer en local

```bash
npm start            # ou : node server.js
# puis http://localhost:3000/club/index.html
```

Le site s'ouvre aussi directement en fichier, mais les transitions entre pages ont besoin d'une vraie adresse http.

## Données partagées

Le site utilise la même fonction Supabase que l'ancien site (`functions/v1/sync`).
Chaque donnée est une clé :

| Clé | Contenu | Partagée avec l'ancien site |
| --- | --- | --- |
| `boberClubStrats` | strats ajoutées ou modifiées par la team (`{ id: strat }`, `{ id, supprime: true }` cache une strat du playbook) | non |
| `boberClubDispos` | dispos par semaine (`{ 'AAAA-MM-JJ': { joueur: { c: { 'jour-heure': 'oui' \| 'peut' }, aucune, maj } } }`) | non |
| `boberUpcomingMatches` | matchs à venir | oui |
| `boberPlayedMatches` | résultats | oui |

**À faire côté Supabase :** la fonction `sync` n'accepte que certaines clés. Ajoute
`boberClubStrats` et `boberClubDispos` à sa liste de clés autorisées (comme dans `ALLOWED_KEYS` de `server.js`).
Tant que ce n'est pas fait, le site affiche « Partagé en partie » : les strats et les dispos
restent sur l'appareil de chacun, les matchs sont bien partagés.

Le site interroge le serveur toutes les 5 secondes quand l'onglet est ouvert. Avant chaque envoi,
il récupère les données fraîches et rejoue ses changements par-dessus, pour ne pas écraser ceux des autres.

## Ajouter une strat

- **Depuis le site** : bouton « Ajouter une strat » sur la page d'une map. Les captures sont réduites
  (900 px, JPEG) avant d'être enregistrées. Toutes les strats tiennent dans une seule clé, limitée à 900 ko :
  au-delà, le site demande un lien d'image (Imgur, Google Drive…) au lieu d'un fichier.
- **Dans le code** (strats de référence, images dans le dépôt) : ajoute une entrée à `STRATS_PLAYBOOK`
  dans `js/donnees.js`, avec les images à la racine du dépôt (`../NOM%20DU%20FICHIER.png`).

## Joueurs, maps, agents

Tout est dans `js/donnees.js` : `JOUEURS`, `STAFF`, `MAPS` (sites, guide PDF éventuel) et `AGENTS`.
Le pseudo choisi sur le site est gardé sur l'appareil ; il n'y a pas de mot de passe.

**Map pool.** L'interrupteur « Map pool » de l'accueil et de la page des strats n'affiche que les maps
marquées `pool: true` dans `MAPS` (activé par défaut, chaque joueur peut le couper ; son choix reste sur
son appareil). Quand Riot change le pool, déplace les `pool: true` et mets à jour `POOL_NOM`.
Pool actuel (V26 Acte 6) : Abyss, Bind, Corrode, Haven, Lotus, Summit, Sunset.

**Image d'une map.** Corrode et Summit n'ont pas encore d'image (`image: ''`) : leur carte a un fond uni.
Pour en ajouter une, dépose `Corrode.webp` (ou `Summit.webp`) à la racine du dépôt et renseigne `image`.

## Fichiers

```
club/
  index.html  strats.html  dispos.html  matchs.html
  css/style.css      thème, bandeau, carrousel, transitions
  js/donnees.js      données, partage, dates
  js/commun.js       bandeau, pseudo, visionneuse, petits outils
  js/cube.js         transition « cube » entre les pages
  js/carrousel.js    carrousel des maps de l'accueil
  js/accueil.js  js/strats.js  js/dispos.js  js/matchs.js
```
