# Boucle ergonomique 3 — Historique du plan

25 octobre 2026. Adaptation originale du principe d’annulation des erreurs de préparation, documenté dans les [conseils officiels de shapez 2](https://steamcommunity.com/app/2162800/announcements/). Cette passe ne revendique pas de décompilation de shapez 2.

## Livré

- Annulation et rétablissement de l’ajout d’un objectif, du remplacement par une zone de balayage et de l’effacement complet du plan.
- Libellé de l’action annulable/rétablissable, boutons et Ctrl/Cmd+Z / Ctrl/Cmd+Maj+Z.
- Historique limité à 50 modifications pendant la session. Une nouvelle modification supprime la branche de rétablissement ; les opérations sans changement ne créent pas d’entrée.
- Copies indépendantes des coordonnées. Validation des points avant restauration : un plan hors des limites actuelles n’est pas réappliqué, et l’entrée reste récupérable après réagrandissement de la zone.
- Même verrouillage que la préparation : moteur prêt, mission non démarrée, tous les drones au sol. Aucune annulation de commande de vol.
- Raccourcis limités au panneau de préparation, protégés dans les champs, dialogues et ateliers.
- Plan restauré sauvegardé via le mécanisme existant ; historique non restauré au rechargement. L’annulation des dimensions de zone reste distincte.

## Validation

199 tests unitaires réussis dans 15 fichiers. Compilation réussie ; avertissements préexistants sur scripts historiques et taille du bundle. Test dédié : restauration exacte de huit objectifs, rétablissement, limites de zone, protection de saisie, raccourci clavier, verrouillage en vol, sauvegarde/rechargement sans lancement, mobile. Capture mobile inspectée.

Pas de mesure du gain de temps humain à ce stade. Le test reproductible porte sur la récupération exacte des données et l’absence d’effet de vol.

Régression préparation réussie : ajout, annulation, balayage, exécution moteur, verrouillage, inspecteur, mobile/tablette, aucune erreur JavaScript. Le test utilise maintenant un profil temporaire et centre les contrôles avant clic pour éviter la barre de commandes fixe.
