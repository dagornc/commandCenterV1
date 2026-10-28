# Poste de décision — 26 octobre 2026

## Les huit recommandations

1. **Résumé permanent** dans le bandeau supérieur : état moteur/mission, agents réellement en vol (même prédicat que la télémétrie), couverture mesurée, nombre d’alertes et priorité. Clic : accès au centre d’attention.
2. **Alertes localisées** : regroupement par agent, marqueurs sur la mini-carte, boutons directionnels aux bords de la scène lorsque l’agent est hors champ. Un clic sélectionne et centre. La montée avertissement → critique produit désormais un événement même si l’identifiant d’alerte reste identique. La limitation des répétitions audio reste active.
3. **Prévisualisation des ordres** : portée nominative, objectifs, segments indicatifs et confirmation pour les commandes de flotte du command center et les files d’escadron. Aucun lancement à l’ouverture. Les conditions sont revérifiées à la confirmation. L’arrêt d’urgence reste immédiat. Les commandes de l’interface avancée embarquée ne passent pas par cette nouvelle prévisualisation.
4. **Actions contextuelles** près du drone sélectionné : inspecter, centrer, préparer un déplacement, préparer un retour. Les deux dernières créent une file limitée à cet agent, à valider dans Escadrons. Aucune exécution directe.
5. **Dispositions** : largeurs ajustables, épinglage contre le repli par Échap, profils Préparation/Supervision/Analyse personnalisables et mémorisés localement, réinitialisation par profil. Sur mobile un seul tiroir latéral est visible ; les largeurs desktop ne réduisent pas la scène.
6. **Mini-carte** : zone, positions, objectifs, alertes et rectangle de caméra tactique. Le clic ou les flèches du clavier changent le cadrage uniquement. En 3D, le cadre continue à représenter la caméra tactique et son libellé le précise.
7. **Bibliothèque locale** : jusqu’à douze modèles de plan ou de file d’ordres, sans identité de drone enregistrée. Échelle et décalages X/Z, validation des limites, chargement en préparation seulement. Le chargement d’un plan s’intègre à Annuler/Rétablir ; les files nécessitent un escadron inactif sélectionné.
8. **Relecture séparée** : positions mesurées une fois par seconde, buffer borné à 1 800 échantillons de la session, choix d’agent, trace récente, curseur temporel, lecture/pause, événements cliquables et export JSON. La simulation continue derrière la fenêtre modale. Aucune commande de vol depuis la relecture. L’enregistrement n’est pas persistant au rechargement ; l’export permet de le conserver. Les interruptions de télémétrie sont signalées, sans interpolation des traces à travers les interruptions.

Les segments de prévisualisation ne sont pas des trajectoires garanties, les plans ne constituent pas une limite physique de vol et aucune durée de trajet estimée n’est inventée. Les états « accepté » des escadrons correspondent au simulateur local, pas à un accusé de réception d’un drone physique.

## REA / Ghidra : provenance

Workflow de la skill REA 6.7.0 : inspection des preuves conservées, lecture des limites et sélection des mécanismes pertinents. Le bundle OpenTTD a été réinspecté : neuf enregistrements, aucune révision inconnue (`rea-summary.json`).

- `ExtraViewportWindow::OnClick`, 0xee9da0, preuve `ev_03a2922844e73809065f0b872fdca0f0ab9bd3397729220c498a69a3a3d27446` : séparation des branches de zoom et transfert de cadrage. Adaptation : mini-carte/navigation indépendantes des ordres.
- `DrawOrderString`, 0xd41aa0, preuve `ev_5e612461de480cfc01f46354671bafd15c8a27ecf07fc8b8f40ae5a18078129a` : affichage conditionnel lié à l’index d’ordre. Adaptation : portée et progression explicites, sans prétendre disposer d’un accusé réseau.
- `OrdersWindow::OnVehicleSelect`, 0xd47ed0, preuve `ev_7cb84f27f954a62b0cd92696833f5c52b2eb4e4460761696bc30a3a1c73e9034` : référence native de gestion des sélections/files. Les modèles paramétrables et la relecture sont des implémentations propres à DIAMANTS, pas des fonctionnalités démontrées par cette fonction.

Ghidra 12.1.4 a été lancé avec le JDK 21 installé et son journal a confirmé le démarrage. Aucun code ou asset de jeu copié. Les références documentaires Factorio, Civilization VII et Frostpunk 2 utilisées pour la proposition sont distinctes de ces preuves OpenTTD ; aucune décompilation de ces trois jeux n’est revendiquée.

Sources : https://github.com/morluto/rea ; https://github.com/NationalSecurityAgency/ghidra ; https://wiki.factorio.com/Alerts ; https://wiki.factorio.com/Blueprint ; https://steamcommunity.com/app/1295660/announcements/ ; https://news.xbox.com/en-us/2025/09/18/adapting-frostpunk-2s-depth-to-a-gamepad/

## Validation

- 206 tests unitaires réussis dans 18 fichiers.
- Parcours navigateur dédié réussi : résumé, préparation sans lancement, refus de modèle hors zone, transformation de plan, largeur sauvegardée, mini-carte sans ordre, aggravation d’alerte, flèche hors champ/localisation, file contextuelle d’un seul agent, relecture, confirmation de lancement et absence de débordement horizontal à 390 px.
- Captures desktop et mobile ; suppression des libellés superposés dans la mini-carte et repli des outils contextuels au passage en petit écran.
- Build de production réussi avec les avertissements préexistants sur scripts historiques non-module et poids du bundle simulation.

Les anciens tests navigateur qui exécutent des commandes incluent désormais l’étape de confirmation. La nouvelle couverture principale se trouve dans `tests/command-center-decisions-browser.cjs` et `tests/command-center-decisions.test.js`.

Contrôle supplémentaire confirmé sur le port 5550 : un seul drone exécute la séquence déplacement/attente/retour, les dix autres restent IDLE ; annulation immédiate testée. Parcours principal relancé avec succès après les corrections de focus et de relecture.

La première nouvelle analyse native ciblant `OrdersWindow::OnClick` (0xd4be40) a dépassé le délai d’import Ghidra de 330 secondes. Son diagnostic est conservé dans `rea-native-first-attempt.json` ; cet essai ne produit pas une preuve de décompilation réussie.

Recherche de navigation vérifiée sur 1440/768/390 px : accents, clavier, résultats vides, restitution du focus, isolation des dialogues, ateliers et absence de lancement. Bibliothèque, dispositions et relecture accessibles depuis cette recherche.

La seconde analyse native a utilisé `REA_GHIDRA_DISABLED_ANALYZERS=Decompiler Switch Analysis,Decompiler Parameter ID,Stack`. Elle a également dépassé les 330 secondes d’import. Aucun nouveau dossier de fonction valide n’a été obtenu. Résumé dans `rea-native-light-attempt.json` ; diagnostics bruts compressés des deux essais conservés. Les preuves natives réussies exploitées pour cette livraison restent celles du bundle antérieur, explicitement identifiées ci-dessus.
