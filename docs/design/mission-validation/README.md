# Validation des missions — 27 octobre 2026

Périmètre : simulateur frontend local, flotte de 11 drones, profils Chrome temporaires. Aucun appareil réel piloté. Les échanges avec un serveur ROS et la génération de missions par Ollama ne sont pas validés par ces tests.

## Couverture navigateur

- Cinq doctrines : exploration, swarm, coverage, formation, search.
- Pour chacune : sélection des sept COA, vérification de la doctrine et du générateur de trajectoires transmis au moteur ; annulation de la prévisualisation sans décollage ; confirmation puis passage des onze drones en exploration ; déplacement observé ; changements de mode en vol avec positions finies ; retour et atterrissage de toute la flotte.
- Sept COA : adaptive, stigmergy, grid, boustrophedon, spiral, radial, perimeter. Les changements en vol sont des contrôles de fonctionnement courts, pas des mesures de performance ni des missions complètes pour chacune des 35 combinaisons.
- Préparation : points sur la carte, annulation, balayage de zone, lancement, objectifs pris en compte par le moteur, verrouillage d’édition en vol.
- Escadron : séquence déplacement/attente/retour jusqu’à sa fin, dix autres drones inactifs, annulation, priorité du lancement et du décollage globaux sur une file locale.
- Bibliothèque : enregistrement de plans et files, transformations et refus hors zone, prévisualisation limitée au bon nombre d’agents ; relecture et affichage mobile.
- Commandes manuelles : décollage, vol stationnaire, atterrissage, nouveau décollage, arrêt d’urgence.

Les doctrines autonomes sont continues : le test vérifie leur exécution puis leur retour commandé, sans prétendre mesurer une couverture exhaustive ou une fin automatique.

## Correction

Le test de cohérence du transport a reproduit une discordance : `handleLaunch()` envoyait toujours `mission_type: exploration`, même pour une autre doctrine. Le message utilise désormais l’identifiant de la doctrine active. Le test observe les arguments du transport ; il ne prouve pas leur réception par un backend distant.

Le test existant des plans a aussi été actualisé pour confirmer explicitement la nouvelle prévisualisation avant de vérifier l’exécution.

## Tests reproductibles

Depuis le répertoire frontend, exécuter avec Node les scripts suivants :

- `tests/command-center-all-missions-browser.cjs`
- `tests/command-center-flight-controls-browser.cjs`
- `tests/command-center-plan-browser.cjs`
- `tests/command-center-squads-browser.cjs`
- `tests/command-center-squads-priority-browser.cjs`
- `tests/command-center-decisions-browser.cjs`

La suite unitaire comprend 206 tests, dont les combinaisons doctrine × COA × autonomie et les signatures de trajectoires. Le rapport des cinq doctrines est généré dans `/private/tmp/all-missions-results.json`.

Résultat final du parcours des doctrines : cinq doctrines réussies, avec contrôles en vol des sept COA pour chacune, cohérence de la commande transmise et retour de tous les drones au sol. Rapport : [doctrines-results.json](doctrines-results.json). Suite unitaire après correction : 206/206 réussis dans 18 fichiers. Compilation Vite réussie (avertissements existants concernant les scripts legacy et la taille du bundle).

Deux tentatives intermédiaires ont rencontré des délais sous exécution concurrente. La reprise séquentielle des cinq doctrines a terminé sans erreur JavaScript. Le test des commandes manuelles attend désormais la disponibilité du bouton après la mise à jour de l’interface, au lieu de cliquer immédiatement sur un état moteur nouvellement atteint.

Le parcours manuel final a également réussi : décollage, vol stationnaire, atterrissage, second décollage et atterrissage d’urgence, sans erreur JavaScript.
