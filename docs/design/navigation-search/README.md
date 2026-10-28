# Navigation recherchable — 25 octobre 2026

## Livré

Accès « Rechercher un outil » dans la barre tactique, touche O, 22 destinations : préparation, supervision, escadrons, vues, alertes, systèmes, préférences, aide, dix ateliers, bilans, journal et liste des drones. Recherche multi-mots insensible aux accents, flèches/Entrée, Échap, restitution du focus, état vide explicite. Présentation cohérente avec les panneaux tactiques, libellés et descriptions, cibles tactiles et dialogue responsive.

Les destinations réutilisent les gestionnaires existants. Elles n’émettent aucun ordre de vol. Les touches / (recherche flotte) et Ctrl/Cmd+K (console) sont conservées. Le raccourci de console ne superpose plus de dialogue à une fenêtre ouverte. Aucune fonctionnalité retirée ; moteur iframe conservé. Les modifications antérieures du dépôt sont préservées.

## Références et limites

- [REA](https://github.com/morluto/rea) : skill local version 42, CLI 6.7.0. `inspect-evidence-bundle` a relu les neuf enregistrements OpenTTD complets : [résumé](rea-evidence-summary.json). Réutilisation de preuves antérieures, aucune nouvelle décompilation revendiquée.
- [Analyse native OpenTTD existante](../rea-ghidra-openttd.md) : `ExtraViewportWindow::OnClick`, Evidence `ev_03a2922844e73809065f0b872fdca0f0ab9bd3397729220c498a69a3a3d27446`, séparation de navigation/cadrage et actions de simulation. Les neuf limites natives de cet enregistrement restent applicables.
- [Analyse shapez existante](../rea-game-reference.md) : HUD, accès aux outils, raccourcis et priorité des dialogues. La recherche textuelle de destinations est une adaptation originale DIAMANTS, pas une fonction attribuée au pseudocode OpenTTD.
- [Factorio Quickbar](https://wiki.factorio.com/Quickbar) et [Shortcut bar](https://wiki.factorio.com/Shortcut_bar) : accès aux fonctions sans parcourir un inventaire, transposé à la navigation entre panneaux.
- [Age of Empires II, groupes et raccourcis](https://www.ageofempires.com/learn-to-play/match-goals-aoe2/) : accès direct aux groupes ; la recherche complète les escadrons existants.

Pas de classement mesuré des jeux ni de décompilation de Factorio/Age of Empires. Aucun code ou asset de ces jeux ajouté.

## Ghidra actif

Installation existante Ghidra 12.1.4, JDK 21.0.13, Node 24.22.1. Diagnostic REA sain pour le fournisseur Ghidra : [contrôles](rea-ghidra-check.json). Interface lancée avec le lanceur officiel : `Ghidra startup complete (3678 ms)`. Le bac à sable empêchait initialement l’écriture des préférences Java et du cache Clang ; exécution autorisée hors bac à sable, sans changement de configuration MCP. Le jeu n’a pas été exécuté.

## Validation

- 193 tests unitaires, 13 fichiers : réussis.
- Build de production réussi ; avertissements préexistants sur scripts historiques et taille du bundle.
- Nouveau parcours navigateur : recherche sans accents, clavier, aucun résultat, fermeture/focus, absence de dialogues superposés, atelier communications, saisie protégée, même moteur, aucun décollage, 1440/768/390 px sans débordement et sans erreur JavaScript.
- Régressions réussies : barre tactique ; espaces de travail, brouillon et file conservés ; 35 commandes source / 35 miroirs, huit ateliers et synchronisation.
- Captures desktop/mobile inspectées visuellement.

Ces tests ne remplacent pas une étude d’utilisabilité et ne couvrent pas toutes les combinaisons du simulateur.
