# Inventaire de couverture du panneau de commande

Audit statique du 17 octobre 2026, avant extension de la couverture. Référence : `DIAMANTS_FRONTEND/Mission_system/simulation.html`, `main.js`, `ui/panel-controller.js` et modules montés par `main.js`. Les états ci-dessous décrivent le Command Center avant cette extension ; ils servent de critères de réception, pas de déclaration de couverture finale.

**C** = couvert ; **P** = partiel ; **M** = manque un accès dans le Command Center ; **N** = inactif/non publié dans le dépôt public. Chaque ligne peut être intégrée nativement ou exposée dans un espace expert au sein du même moteur. Ouvrir une deuxième simulation indépendante ne préserve pas la mission courante.

## Commandes et préparation

| Fonction et contrôle source | Gestionnaire / frontière | État initial | Prérequis / réception |
|---|---|---|---|
| Lancer `launchMission()` | `PanelController.handleLaunch` | C | Moteur prêt ; retour false reconnu ; pas de relance pendant atterrissage |
| Arrêt `emergencyLand()` | `handleStop` | C | Annule aussi le départ différé |
| Décollage `takeoffAllDrones()` | `handleTakeoff` | C | Toute la flotte |
| Atterrissage `landAllDrones()` | `handleLand` | C | Toute la flotte |
| Retour base `returnToHome()` | `handleReturnToHome` | C | Attendre arrivée et atterrissage |
| Reset complet `resetMission()` / `resetSwarm()` | `handleReset` | M | Réinitialise la mission et ses données ; libellé distinct de l’arrêt |
| Reset drones seuls `resetDronesOnly()` | `handleResetDronesOnly` | M | API exposée, pas de bouton statique ; préserver distinction avec reset complet |
| Doctrine `mission_type` | `doctrineManager.setDoctrine` via change | M | exploration, swarm, coverage, formation, search |
| Course of Action `mode_select` | `doctrineManager.setCOA` via change | M | adaptive, stigmergy, grid, boustrophedon, spiral, radial, perimeter |
| Formation `setFormation(type)` | `handleSetFormation` | M | API publique additionnelle ; types de `mission-doctrine.js` |
| Autonomie `autonomy-slider` / `autonomy-ticks [data-step]` | `uiController.setAutonomyStep` | M | Six crans 0..5, événement `diamants:autonomy-change` ; ne pas confondre cran et pourcentage |
| Altitude `altitude_slider` | `applyAltitude` sur input | M | 1..8 m par 0,5 dans l’UI source |
| Séparation `safety_distance` | `applySafetyDistance` | M | 1..8 m |
| Zone globale `bounds_x`, `bounds_y` | `applyExplorationBounds` | M | 10..10000 m dans l’UI ; distinguer limites globales et polygone de balayage |
| Points et polygone de balayage | Nouveau `command-center/mission-plan.js` | C | Extension native ; ne remplace ni doctrine ni COA |
| Recherche de configuration optimale `optimal-search-ui` | `system.optimalSearchUI.show()` ; `_applyConfig` | M | Ctrl/Cmd+K dans le simulateur ; recherche, priorités couverture/temps/énergie/fiabilité/adaptabilité, sélection puis Entrée ou double-clic ; scores fondés sur baselines simulées |

## Balises et scénarios

| Fonction / ID source | Gestionnaire | État initial | Prérequis / réception |
|---|---|---|---|
| Placement scène `btn-place-beacon-click` | `DIAMANTS.beacons.enterPlacementMode/exitPlacementMode` | M | Clic scène 3D ; annuler via HUD / Échap ; événement beacon-mode |
| Une balise aléatoire `btn-place-beacon-random` | `DIAMANTS.placeRandomBeacons(1)` | M | BeaconSystem prêt |
| Trois balises `btn-place-beacon-3` | `DIAMANTS.placeRandomBeacons(3)` | M | Idem |
| Effacer balises `btn-clear-beacons` | `DIAMANTS.clearBeacons()` | M | Mettre à jour compteur |
| Choix scénario `scenario-select` | `scenarioEngine.getAll/get` | M | Catalogue JSON, catégories et description/objectifs/observations |
| Lancer / arrêter `btn-scenario-launch` | `scenarioEngine.resetAndExecute` / `execute` | M | Scénarios à bascule : arrêt sans reset ; autres : reset et lancement ; afficher result.ok/message |
| Variantes mobiles `mobile-scenario-select`, `mobile-btn-scenario-launch`, `mobile-btn-place-beacon`, boutons beacon random/x3/clear | Proxy des mêmes services | M | Même fonction et état sur petit écran, sans double moteur |

## Caméra, cartes et affichage

| Fonction / ID source | Gestionnaire | État initial | Réception |
|---|---|---|---|
| Reset caméra `resetCamera()` | `handleResetCamera` | P | Distinguer cadrage 2D et reset 3D |
| Vue dessus `topView()` | `handleTopView` | M | Caméra 3D |
| Vue toute flotte `zoomToSwarm()` | `handleZoomToSwarm` | P | Vue flotte 2D existante ; accès 3D requis |
| Suivi `toggleFollowMode()` / drone choisi | `handleToggleFollow`, `DroneSelectPanel` | C | Suivre choisi, quitter suivi |
| Rotation `auto-rotate-btn` | `window.toggleAutoRotate` dans simulation.html | M | Contrôle OrbitControls ; geste manuel quitte rotation |
| Verrou caméra | `system.lockCamera()` / touche L | M | État visible |
| Plein écran F | `document.requestFullscreen/exitFullscreen` | M | Requiert geste utilisateur |
| Post-processing P | `system.usePostProcessing` | M | Capacité renderer ; pas de promesse si composer absent |
| Labels `btn-toggle-labels` / `toggleDroneLabels()` | `handleToggleLabels` | P | Réglage labels tactiques existant, labels 3D distincts |
| Ondes `btn-toggle-comm` / `toggleCommWaves()` | `handleToggleCommWaves` | M | Visuel 3D ; ne pas confondre avec liens de proximité 2D |
| Minimap `toggleMinimap()` | `handleToggleMinimap` | M | Six vues source ci-dessous |
| SITAC `sitac-map` | `minimapManager.openViewer('sitac-map')` | M | Détection d’objets |
| Exploration `minimap` | `openViewer('minimap')` | P | Stigmergie source distincte du calque couverture natif |
| SLAM `perception-map` | `openViewer('perception-map')` | M | Reconstruction / cartes perception |
| Découverte `discovery-map` | `openViewer('discovery-map')` | M | Pixels de découverte |
| Fédération `federated-map` | `openViewer('federated-map')` | M | Vue publique disponible ; ne prouve pas entraînement MARL |
| Communication `comm-panel-map` | `openViewer('comm-panel-map')` ; `DIAMANTS_COMM_PANEL` | M | Réseau P2P / événements, pas distances inventées |
| Gestion cartes | picker, closeViewer, close(id), détachement, lightbox | M | Fermer/revenir, redimensionnement et petit écran |
| Masquer panneau `toggle_panel` / togglePanel | `handleTogglePanel` | P | Inspecteur natif repliable couvre intention ; espace expert doit être refermable |
| HUD `toggleDiamantsHUD`, debug `toggleDebugPanels` | handlers publics | M | Disponibilité conditionnelle des éléments |
| Qualité `quality-control-panel .quality-selector` | `environment.qualityPanel` callbacks | M | low/medium/high/ultra/dev/experimental ; panneau créé conditionnellement |
| Qualité auto `.auto-quality-toggle`, détection `.detect-button` | callbacks QualityControlPanel | M | Auto adapte aux performances ; détection GPU ; métriques FPS/brins/chunks et estimations signalées |

## Intelligence, flotte et observation

| Fonction / ID source | Gestionnaire | État initial | Prérequis / réception |
|---|---|---|---|
| Activation `btn-toggle-llm` | `toggleLLM` / `handleToggleLLM` | M | `integratedController.droneIntelligenceManager` ; indisponible explicitement si absent |
| Serveur `ollama-url` | `setOllamaUrl` | M | Connecteur ; ne pas afficher succès sur no-op |
| Modèles `llm-model-x500`, `llm-model-s500`, `llm-model-cf` | `setLLMModel(type,model)` | M | Types X500/S500/CRAZYFLIE |
| Influence `llm-influence-slider` | `setLLMInfluence` | M | 0..1 pas 0,05 |
| Connectivité `btn-ping-ollama` | async `pingOllama` | M | Serveur HTTP Ollama accessible / CORS |
| Reset cerveaux | `resetLLMBrains()` | M | Efface état/caches, respecte activation volontaire |
| Statistiques LLM / cerveaux `llm-brains-summary` | updater du PanelController | M | Connectivité, comptes et décisions ; mode offline distinct |
| Décisions `llm-decision-feed` + overlay | `diamants:llm-decision`, `_showExpandedDecision` | M | Flux historique, décision complète, modèle, confiance ; `_demo` doit être clairement marqué |
| Chat `llm-chat-panel`, `llm-input`, `llm-send-btn` | `system.llmChatPanel` / `DIAMANTS.llmChat`, `missionService.processMessage` | M | Saisie/Entrée, actions rapides zone nord / balise / patrouille / formation / exploration / retour, réponses, statut ; service local + Ollama selon action |
| Chat balise `llm-btn-beacon` + liens balises | BeaconSystem / `_focusOnBeacon` | M | Placement et recentrage |
| Chat réduire/fermer `llm-btn-minimize`, `llm-btn-close` | panel minimise/hide, touche C | M | Panneau déplaçable/redimensionnable ; conserver accès sur mobile |
| Profils `fleet-models-panel`, `fm-fichier`, `fm-json`, `fm-ajouter`, `fm-exemple` | `__fleetModelsPanel.ouvrir/ajouterProfil` | M | JSON physique/performance/PID ; validation du registre |
| Ajouter drone `[data-poser]` | `__fleetModelsPanel.poser(profileId)` | M | Appelle spawn puis launch/takeoff : effet de vol à rendre explicite |
| Modèle par profil `fm-profil-cible`, `fm-provider`, `fm-model`, `fm-baseUrl`, `fm-url`, `fm-name`, `fm-conf`, `fm-appliquer` | gestionnaires fleet-models-panel | M | Ollama / openai-compatible / http-policy ; endpoint externe requis pour inférence ; seuil 0..1 |
| Statistiques règles `fm-stats` | intelligence manager stats | M | Accepted/rejected/vetoes/failures ; pas de chiffres inventés |
| Fiche agent `drone-select-panel`, `dsp-follow-btn`, `dsp-close`, `dsp-comm-section` | `DroneSelectPanel` | P | Inspection native position/vitesse/phase/cible ; autonomie mesurée et message communication (pairs, directive, dernier message) à couvrir |
| Coordination `swarm-rl-panel` | `system.swarmCoordinationPanel.show/toggle` ; touche B | M | Coordonnateurs/scouts, rounds, couverture, inférences ; événements swarm-coordination/drone-positions/mission-status |
| Hypervision `fractal-hypervision-panel`, `fractal-stack`, `fractal-detail` | `system.fractalPanel.toggle`, `.fractalHypervision.setFocusLayer/drillDown/drillUp` | M | Six couches L0–L5 ; V et flèches ; source ROS/local visible |
| CAS / connexion `diamants-cas-hud`, `mode_badge`, FPS | `system.casController` / `DIAMANTS.cas`, événements mode-change/cas-changed | P | Badge moteur natif ne remplace pas SIM/REAL/SITL ni CAS1/2/3 |
| Intelligence collective `stigmergy_value`, `emergence_level`, `cohesion_index`, `coordination_score` | MetricsUIConnector | M | Données source ; développer `emergence_toggle` pour M1 couverture, M2 diversité, M3 flux |
| Export journal / centre attention | natif Command Center | C | Extensions ; ne remplacent pas les métriques et décisions originales |

## Code présent mais inactif : ne pas promettre de fonction inexistante

- `ui/marl-training-panel.js` est explicitement une coquille publique : show/hide/toggle/update/destroy sont no-op. Entraînement, courbes, import/export des poids appartiennent à une pile non publiée. Mentionner indisponible plutôt qu’un bouton qui ne fait rien.
- `ui/orchestration-console.js` est importé mais `main.js` conserve `orchestrationConsole = null` et ne le construit pas. Recherche/filtres/export de cette ancienne console ne sont pas une fonction montée du panneau courant.
- `ui/diamant-ui.js` n’est pas importé ni construit par `main.js`. Ses boutons pause/physics/PID/ROS, ancien sélecteur de mission et vitesse de simulation ne sont pas des commandes actives de `simulation.html`. Le contrôleur actif est `ui/diamants-ui-controller.js`.
- `PanelController.wireAllButtons` mentionne runQuickBenchmark/handleBenchmark, mais aucun bouton dans simulation.html et aucune définition handleBenchmark dans ce contrôleur. Ne pas câbler cette référence morte.
- Raccourci A : auto-focus forcé désactivé dans main.js. G dans main.js ne fait que journaliser « fog désactivée » ; G du QualityControlPanel bascule le panneau lorsqu’il existe. Ne pas présenter la brume comme commande effective.

## Stratégie de couverture et vérification

Conserver les commandes de vol au premier niveau ; grouper la configuration en Mission, Intelligence, Flotte, Cartes et Diagnostic. Utiliser des panneaux à ouverture contextuelle, un état persistant, des libellés courts, une recherche de commandes et un retour d’état pour chaque action. Les contrôles avancés doivent agir sur **la même instance** iframe. `command-center/embedded.css` masque actuellement tous les enfants body hors canvas, ainsi que les overlays dans canvas_container ; appeler show() seul ne suffit pas. Une exposition ciblée et testée des panneaux dans cette instance couvre les fonctions complexes sans réimplémenter leurs services.

Tests de réception : pour chaque ligne active, accès clavier et pointeur ; effet moteur ou DOM constaté ; état indisponible si dépendance absente ; fermeture et retour au centre ; largeur 390/768/1440 sans débordement ; aucun succès fictif quand une méthode optionnelle manque. Tester les fonctions réseau avec un serveur de test ou annoncer honnêtement seulement l’interface et l’échec explicite, sans prétendre tester une inférence réelle hors ligne.

## Couverture livrée — 17 octobre 2026

Les **35 contrôles** (boutons, champs et listes) présents dans `#ros_interface` sont accessibles dans Commandes & systèmes. Ils transmettent les événements aux éléments d’origine : mêmes gestionnaires et valeurs, sans deuxième simulation. Les sections de métriques, décisions et performances sont également exposées.

Les commandes de vol utilisent la validation du dock. Le reset complet remet aussi à zéro le temps et les traces du Command Center. Choisir une doctrine ou un COA retire le plan manuel prioritaire pour que la nouvelle configuration puisse agir.

Dix entrées d’atelier exposent les panneaux actifs : panneau complet, flotte/modèles, fiche agent, chat, six cartes, communications, coordination, hypervision, comparaison de stratégies et qualité. Les APIs supplémentaires de formation, reset des drones, caméra, post-traitement et HUD/diagnostic sont accessibles dans les commandes expertes, avec retour d’indisponibilité lorsque nécessaire.

Chaque atelier utilise une barre persistante : choix d’outil, description, masquer/afficher, agrandir/réduire et retour au centre. Un seul panneau spécialisé est affiché, ancré à droite ; sur mobile il occupe la largeur disponible. Les cadres hérités hors écran sont neutralisés dans ce mode seulement. Les raccourcis de caméra ne s’exécutent plus pendant la saisie de texte.

### Validation et limites

`tests/command-center-controls-browser.cjs` vérifie le nombre de contrôles source/miroir, doctrine, altitude, création/suppression de balises, recherche, les huit panneaux DOM principaux aux largeurs 1440/768/390, la carte communications, masquage/agrandissement et l’identité du moteur avant/après navigation. Cela prouve l’accès et les interactions testées, pas chaque combinaison de scénario ni une connexion ROS ou inférence LLM distante. Ollama n’est pas disponible sur l’environnement de vérification ; son état reste affiché comme tel. Les fonctions publiques inactives listées plus haut demeurent explicitement hors couverture opérationnelle.
