# DIAMANTS Command Center

L'entrée `DIAMANTS_FRONTEND/Mission_system/index.html` ouvre le centre de commandement. L'interface historique reste disponible à `simulation.html`, également utilisée comme moteur embarqué de la nouvelle interface.

## Utilisation locale

```sh
cd DIAMANTS_FRONTEND/Mission_system
npm ci
npm run dev
```

Ouvrir l'adresse annoncée (par défaut http://localhost:5550/). Attendre la connexion des agents puis lancer la mission. Aucun serveur de modèle n'est requis pour le vol autonome local.

- Carte tactique : positions, forêt issue de la scène, cellules visitées, trajectoires conservées pour la session, point de passage de l'agent sélectionné.
- Navigation : déplacement de carte par glisser, zoom, recentrage ; sélection partagée avec la flotte.
- Calque Proximité : distance horizontale inférieure à 30 m ; ce n'est pas une mesure de connectivité radio.
- Scène 3D : rendu d'origine et suivi d'agent. Zoom/recentrage quittent le suivi.
- Flotte : recherche, filtre en vol/au sol et inspecteur de télémétrie.
- Commandes : lancement, décollage, atterrissage, retour base, arrêt d'urgence. L'arrêt utilise l'atterrissage du moteur, sans interrompre sa boucle physique.
- Journal : événements observés et commandes transmises, export JSON avec télémétrie, maximum 300 entrées en mémoire.
- Préférences locales : étiquettes et réduction des animations. Les préférences système de réduction des animations sont respectées.

Les positions, vitesses, phases et couverture viennent du moteur. La batterie reste « — » lorsque le moteur ne la fournit pas. L'illustration du drone est un schéma générique. Il s'agit d'une simulation locale, sans commande d'aéronef physique. Les fonctions incendie non publiées par le dépôt amont ne sont pas ajoutées artificiellement.

## Référence de jeu et REA

Voir [l'analyse REA de shapez](rea-game-reference.md) et son [extrait de preuve](rea-shapez-evidence-excerpt.json). La barre d'outils contextuelle, les panneaux bornés, le filtrage et les événements typés ont été transposés dans une implémentation originale. Aucun asset graphique commercial n'est copié.

## Structure

- `command-center/app.js` : interactions, sélection, journal, rendu des panneaux, cycle de lecture à 2 Hz.
- `command-center/simulation-adapter.js` : lecture normalisée du moteur et passage des commandes existantes ; données absentes conservées comme telles.
- `command-center/tactical-map.js` : projection X/Z en canvas, calques et navigation.
- `command-center/styles.css` : styles et dispositions ordinateur/tablette/mobile.
- `command-center/embedded.css` : masque l'interface historique seulement avec `?embedded=1`, en conservant son moteur et son DOM fonctionnel.
- `simulation.html` : ancienne entrée, préservée ; `tools/three-bootstrap.js` utilise désormais la dépendance Three.js locale.
- `vite.config.js` : deux entrées de compilation et copie des ressources 3D chargées par chemin à l'exécution.

Le démarrage différé de l'exploration est annulé lors d'un atterrissage, retour, arrêt, reset et destruction. Le retour base termine la mission d'exploration pour permettre une nouvelle mission après le posé.

## Vérification

```sh
npm test
npm run build
# Avec npm run dev déjà lancé :
node tests/command-center-browser.cjs
# Contre une version compilée servie avec npm run preview :
COMMAND_CENTER_URL=http://localhost:4173/ node tests/command-center-browser.cjs
```

Le test navigateur utilise Chrome sur macOS s'il est présent, sinon Chromium de Puppeteer. `CHROME_PATH` permet de sélectionner un autre exécutable. `COMMAND_CENTER_OUTPUT` change le dossier de captures et résultats (défaut `/private/tmp/diamants-command-qa`).

Validation effectuée le 16 octobre 2026 : 159 tests unitaires réussis. Essai navigateur réel : 11 agents, recherche, filtres, sélection, paramètres, clavier, calques, lancement/arrêt et annulation différée, exploration et couverture, suivi 3D, recentrage, retour base/posé, export JSON, largeurs 390 et 768 px. Les demandes optionnelles de l'interface historique vers Ollama (`localhost:11434`) échouent en l'absence de ce service ; elles ne bloquent pas la simulation. Aucun fournisseur de modèle n'a été configuré.

### Compilation sur ce poste

La compilation complète a été exécutée avec succès dans un dossier temporaire propre :

```sh
npm run build -- --outDir /private/tmp/diamants-production-verified
npx vite preview --host 127.0.0.1 --port 5553 --outDir /private/tmp/diamants-production-verified
```

Le dossier `dist` créé lors du premier essai contient des fichiers que macOS refuse de supprimer (`EPERM`), y compris hors sandbox. Il n'a pas été forcé ni utilisé pour la validation finale. Sur ce poste, utiliser un autre `--outDir` propre tant que ce verrouillage subsiste. Les avertissements Vite sur les scripts historiques et la taille du bundle 3D subsistent ; les scripts chargés à l'exécution et `fleet_config.json` sont copiés par le plugin de compilation.

La même suite navigateur a également réussi contre la version compilée sur `http://127.0.0.1:5553/` : 11 agents, déplacement effectif à plus de 25 m du centre, retour jusqu'au posé, aucune exception JavaScript. Voir [résultats](command-center-browser-results.json), [capture ordinateur](command-center-desktop.png) et [capture mobile](command-center-mobile.png).

## Améliorations de pilotage

- Barre de commandes fixe : lancement, décollage, atterrissage, retour base et arrêt d’urgence restent accessibles pendant le défilement, sur ordinateur comme sur mobile. Le lancement devient « Mission en cours » lorsqu’une exploration est active.
- Cadrage : « Vue flotte » maintient les agents dans le cadre ; « Centrer agent » suit la sélection. Une manipulation de zoom ou de déplacement repasse en vue libre. Les marqueurs proches sont regroupés ; cliquer un groupe zoome dessus. À fort zoom, les marqueurs restent individuels. Les étiquettes sont placées dans les espaces libres, avec priorité à l’agent sélectionné.
- Centre d’attention : conditions actives issues des données du moteur, triées par priorité, sans duplication à chaque lecture. Batterie ≤20 % (critique ≤10 %) uniquement si renseignée, position absente, phases d’urgence, alertes de proximité en vol, sorties de zone, perte du moteur ou erreur de commande. Un clic sur une alerte d’agent le sélectionne et le localise. Les conditions résolues quittent la liste, tandis que leur apparition reste dans le journal.
- Texte des indicateurs et de la flotte agrandi. Aucune alerte n’est fabriquée pour remplir l’interface.

Validation de cette évolution : 166 tests unitaires réussis, parcours navigateur de mission complet réussi, compilation réussie dans `/private/tmp/diamants-operations-build`. Le test `tests/command-center-attention-browser.cjs` vérifie séparément la navigation depuis une alerte et sa résolution avec une mesure de batterie injectée uniquement dans un navigateur de test jetable.

### Préparation de mission et intentions

Le préparateur ajoute jusqu’à 24 objectifs par clic sur la carte, ou neuf points de balayage à partir de deux coins (minimum 5 × 5 m). Les coordonnées doivent rester dans les limites du terrain. Les points sont répartis entre agents et transmis au `missionWaypointProvider` existant lors du lancement. Un agent passe au suivant à moins de 3 m de sa cible et recommence le parcours après le dernier objectif. L’altitude et l’évitement restent gérés par le moteur. Il s’agit de cibles, pas d’une clôture de vol ou de zones interdites.

Le plan reste en mémoire dans la page et figure dans l’export JSON. Il est modifiable uniquement lorsque tous les agents sont au sol. Effacer le plan restaure le fournisseur précédent au prochain lancement. Les intentions affichées viennent de la phase, de la cible et des décisions du moteur ; les décisions anciennes ne sont pas affichées pendant l’atterrissage. L’inspecteur peut être masqué pour agrandir la carte.

Le contrôle de relance attend désormais les phases IDLE/LANDED : une faible altitude ne suffit plus à annoncer un arrêt terminé. Le lancement est désactivé durant le retour et l’atterrissage.

### Mémoire locale et bilans (23 octobre 2026)

Les calques tactiques, la visibilité de l’inspecteur et le mode agrandi des ateliers sont mémorisés avec les préférences. Le plan est enregistré séparément (24 points maximum, coordonnées finies). Un rechargement restaure le plan sans lancement automatique ; les limites actuelles du terrain restent validées au lancement. Effacer le plan efface aussi sa copie locale. Si le stockage est refusé, le plan reste utilisable pour la session et un message l’indique.

Le bilan se fonde sur les phases réellement reçues : il commence à la première activité observée et se termine au retour de tous les agents en LANDED, hors mission active. Un reset vers IDLE n’est pas traité comme un atterrissage. Une coupure de télémétrie ne termine pas la mission et est signalée dans le bilan. Les cinq derniers bilans conservés contiennent la durée observée, le nombre d’agents, le maximum d’agents actifs simultanément et la couverture finale fournie par le moteur. Aucun taux d’objectifs atteints n’est inventé. Les bilans sont inclus dans l’export JSON.

Vérifications : tests unitaires de validation/stockage et cycle de bilan, navigateur avec rechargement réel pour restauration/effacement du plan et des préférences, puis scénario de vol complet avec bilan présent après atterrissage.

### Dimensions de la zone d’exploration

Au sol, les contours de la zone sont manipulables directement : tirer un bord modifie une dimension et tirer un coin modifie les deux. Le bouton « Redimensionner la zone » cadre les limites et affiche toutes les poignées. Les dimensions restent centrées sur la base. La prévisualisation n’est appliquée au moteur qu’au relâchement ; Échap annule le geste.

Les champs largeur/profondeur acceptent 10 à 10 000 m. Les préréglages proposent 120, 240 et 500 m. Une modification peut être annulée (un niveau, session courante). Les dimensions appliquées sont conservées localement et restaurées au prochain chargement à l’arrêt, sans décollage. La réduction est refusée si elle exclut des objectifs existants. Le stockage indisponible est signalé. Ces dimensions sont indépendantes du tracé de balayage.

### Escadrons et files d’ordres

Le panneau Escadrons permet de sélectionner les drones par cases à cocher ou par rectangle avec Maj + glisser sur la carte. Jusqu’à neuf groupes nommés peuvent être rappelés avec les touches 1 à 9 (hors saisie). Les groupes et leurs files sont conservés dans la session courante uniquement.

Chaque file comporte jusqu’à 48 déplacements, attentes de 1 à 600 secondes et un retour final à la base. Les objectifs du préparateur peuvent être copiés dans la file. Les étapes peuvent être déplacées ou supprimées avant lancement. Le lanceur valide les coordonnées et l’affectation exclusive des drones aux escadrons actifs avant toute commande. Il appelle le décollage par identifiant et fournit les objectifs uniquement aux membres. Les autres drones conservent leur comportement précédent. Sans retour final, l’escadron maintient sa position après la dernière étape. Annuler une file retire les étapes restantes, sans déclencher un retour ; l’arrêt global garde la priorité.

Les ordres attendent que tous les membres aient décollé. Un déplacement se termine lorsque tous sont à moins de 3 m de l’objectif ; l’attente commence ensuite. Le retour se termine une fois tous les membres au sol. Il s’agit d’une exécution dans le simulateur local, sans validation de commandes vers des appareils physiques.

### Espaces Préparer / Superviser et outils contextuels

Les panneaux Zone & objectifs, Escadrons et Drone partagent maintenant un emplacement à côté de la carte sur ordinateur. Sur tablette et mobile, ils s’empilent sous la carte. Préparer ouvre la zone ; Superviser ouvre la fiche du drone et conserve l’accès aux escadrons. Les saisies, files d’ordres et l’instance du moteur restent en place lors du changement d’espace. Sélectionner un drone affiche sa fiche ; la sélection rectangulaire ouvre les escadrons.

Les champs des ordres s’adaptent au type choisi : coordonnées pour rejoindre un point, durée pour attendre, aucun paramètre pour revenir. Le bouton Choisir sur la carte remplit les coordonnées après un clic valide dans les limites. L’ordre n’est ajouté qu’avec le bouton Ajouter l’ordre. Échap, un changement de type ou de panneau annule la sélection de cible en cours.

Le passage vers un panneau autre que Zone & objectifs désactive le tracé en cours. En supervision, le contour de zone ne peut pas être redimensionné directement par inadvertance ; l’espace Préparer reste accessible pour le modifier.
