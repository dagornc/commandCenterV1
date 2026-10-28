# Validation du Command Center — 23 octobre 2026

Validation locale de la version compilée avec Chrome, sans backend ROS ni Ollama actif.

## Résultats

- Vitest : 174 tests réussis, 9 fichiers, avant et après correction.
- Compilation Vite réussie. Avertissement conservé sur la taille du bundle de simulation 3D.
- Commandes : 35 contrôles source et 35 miroirs, synchronisation doctrine/altitude, balises, recherche avec navigation clavier.
- Ateliers : huit panneaux testés à 1440, 768 et 390 px, carte communications, agrandissement/masquage, même moteur conservé au retour.
- Plan : objectifs, annulation, quadrillage, exécution par le moteur et verrouillage pendant le vol.
- Mémoire : restauration des préférences et du plan, effacement persistant, aucun lancement automatique ni bilan fictif.
- Attention : alertes de batterie injectée, sélection du drone, résolution de l’alerte et commandes accessibles sur mobile/tablette.
- Vol : lancement, arrêt avant exploration différée, relance, déplacement et couverture, suivi 3D, retour, atterrissage, bilan et export JSON.
- Aucune erreur JavaScript de page pendant ces cinq parcours.

## Défauts corrigés

Le premier ajout de Crazyflie depuis l’atelier tentait de créer `crazyflie_01`, déjà présent. L’atelier recherche désormais un identifiant libre dans la flotte et le moteur.

L’atelier enchaînait un lancement, un autre ordre de décollage et une temporisation indépendante de six secondes. Celle-ci échappait à l’annulation du contrôleur. Le lancement passe désormais uniquement par le contrôleur, propriétaire du décollage et de la temporisation annulable.

Le test navigateur `command-center-fleet-browser.cjs` vérifie le passage de 11 à 12 drones, l’arrêt immédiat, l’absence de reprise différée au bout de sept secondes et la possibilité de relancer volontairement.

## Reproduction

Depuis `DIAMANTS_FRONTEND/Mission_system`, exécuter `npm test`, puis compiler avec un répertoire de sortie accessible et servir cette compilation avec Vite preview. Chaque suite accepte `COMMAND_CENTER_URL`. Les suites produisant des captures acceptent aussi `COMMAND_CENTER_OUTPUT` ; utiliser un répertoire neuf pour partir de préférences vierges.

Suites : `command-center-browser.cjs`, `command-center-controls-browser.cjs`, `command-center-plan-browser.cjs`, `command-center-memory-browser.cjs`, `command-center-attention-browser.cjs`, `command-center-fleet-browser.cjs`.

## Limites

Les appels Ollama sur le port 11434 sont refusés car le service n’est pas démarré. Les réponses réelles des fournisseurs de modèles et la liaison avec ROS/des appareils physiques ne sont pas validées. Les parcours couvrent le simulateur local et les principaux contrôles ; ils ne prouvent pas toutes les combinaisons de paramètres possibles.

Note d’exécution : le parcours de vol a écrit son rapport de réussite puis son processus Node est resté actif après la fermeture de Chrome. Ce processus de test a été terminé manuellement ; ses assertions étaient achevées. Les autres suites, dont la régression de flotte corrigée, se sont terminées normalement.

## Contrôle complémentaire des dimensions

Deux régressions ont été reproduites puis corrigées : la perte du brouillon des dimensions après sortie du champ (écrasement au prochain rafraîchissement) et le saut de zoom provoqué par la borne minimale historique après cadrage d’une zone de 10 000 m. Les champs conservent désormais leurs modifications jusqu’à application ; le dézoom reste progressif sur les grandes zones.

Vitest : 176 tests réussis dans 10 fichiers. Les tests navigateur des dimensions couvrent la perte de focus, la saisie précise, les préréglages, l’annulation, la restauration sans décollage, le déplacement d’un bord sans modification de l’autre dimension, Échap, le verrouillage en vol et la mise en page mobile.

## Contrôle complémentaire des escadrons

Un test de régression a reproduit un conflit lors d’une reprise de navigation : l’annulation automatique de l’ancienne file imposait un maintien de position, écrasant ainsi le nouvel ordre. L’annulation automatique retire maintenant la file sans modifier la phase de vol. L’annulation demandée explicitement par l’utilisateur conserve le maintien de position.

182 tests unitaires réussissent, dont l’exécution ordonnée, les affectations exclusives, deux escadrons indépendants, l’annulation sélective et la reprise par un nouveau fournisseur d’objectifs.

Le test navigateur a également reproduit l’absence d’annulation des files après un décollage général natif. Le panneau source émet maintenant un événement TAKEOFF après validation du moteur ; les escadrons abandonnent leurs anciennes files sans écraser le nouvel ordre. La reprise par lancement général, le vol complet d’un escadron avec les dix autres drones immobiles, la sélection rectangulaire et l’édition des étapes sont vérifiés dans Chrome.
