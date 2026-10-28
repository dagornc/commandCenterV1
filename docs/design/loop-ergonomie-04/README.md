# Boucle ergonomie 04 — lectures de carte

Finalisée le 26 octobre 2026. Cycle : rechercher → sélectionner une hypothèse → implémenter → tester → corriger le contraste → vérifier.

## Références après 2024

- **Civilization VII (2025)** : les notes officielles de mise à jour 1.5.0 décrivent les Lens, une règle radiale et l’affichage explicite de valeurs dans la vue Appeal. Principe retenu : une lecture spécialisée, accompagnée d’une explication de ce qu’elle représente. Source : https://steamcommunity.com/app/1295660/announcements/
- **Tempest Rising (2025)** : les notes officielles du 29 septembre 2026 ajoutent l’accès au Codex pendant la partie et des recherches dans ses catégories. Principe applicable : rendre les explications accessibles au moment de décider. Ici, l’explication du calque est directement visible ; la recherche d’outils existante reste disponible. Source : https://steamcommunity.com/app/1486920/announcements/

Ce sont des références documentaires et une sélection adaptée au command center, pas un classement universel ni une preuve de gain de productivité mesuré auprès d’utilisateurs.

## Implémentation

Un sélecteur « Lecture de carte » propose Exploration (couverture seule), Coordination (proximité seule) et Déplacements (trajectoires seules). Les réglages manuels restent accessibles ; toute combinaison différente affiche « Personnalisée ». La persistance utilise les préférences de calques existantes. Les rappels de vues mémorisées synchronisent le sélecteur.

Chaque vue explique ses limites : proximité géométrique sous 30 mètres, pas une liaison radio ; traces observées, pas une prédiction ; cellules visitées, pas une garantie de sûreté. Changer de vue ne lance aucune mission et conserve le cadrage et la sélection.

## REA : résultat et limites

Le téléchargement de l’artefact public OpenFront a échoué avec HTTP 403. Aucun code de Civilization VII, Tempest Rising ou OpenFront n’a été décompilé ni repris dans cette boucle. Les anciennes preuves OpenTTD ne sont pas présentées comme des preuves sur des jeux postérieurs à 2024.

REA 6.7.0 a réellement analysé le bundle construit du command center : `assets/main-a5fb97b5.js`, avec Node 24.22.1. Le premier essai a échoué sur le cache de compilation de l’auxiliaire macOS ; l’essai autorisé hors restriction a réussi. L’analyse statique a lu 99 091 octets, parcouru 25 247 nœuds AST, sans échec de parsing. Elle est partielle : un fichier sélectionné, 55 autres hors périmètre et un plafond de 3 000 nœuds sémantiques. Elle ne prouve ni le comportement au runtime, ni l’absence de défaut.

Preuve : `ev_8be1432cc0aec467c444fbd4b8ff5a641e5325d1daf32c16a1be48e68ed074f2`. Résumé dans `rea-summary.json`, résultat brut compressé dans `rea-evidence.json.gz`. La correction ultérieure concerne les couleurs CSS et change les références/hachages du build final ; cette preuve identifie précisément le build antérieur à cette correction. Ghidra n’est pas nécessaire à cette analyse JavaScript et n’a pas été utilisé sur un nouveau binaire de jeu.

## Validation

- Vitest : **201 tests réussis, 16 fichiers**, dont deux tests de cohérence des vues, conservation du cadrage/sélection et synchronisation des changements manuels/rappels.
- Chrome : les trois préréglages, persistance après rechargement, personnalisation manuelle, largeur 390 px, absence de lancement et absence d’erreur JavaScript.
- Inspection visuelle : correction du sélecteur blanc sur le thème sombre avec les variables de couleur existantes.
- Build de production dans un répertoire temporaire dédié : avertissements préexistants sur les scripts historiques non-module et le poids du bundle simulation.

Le test attend désormais que le simulateur ait fini de charger après chaque rechargement : son écran d’attente interceptait légitimement les clics pendant le premier essai.
