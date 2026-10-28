# Organisation du HUD — 27 octobre 2026

Les quatre bandeaux restent fixes et entourent la scène centrale. Les nœuds existants sont déplacés en conservant leurs événements et leurs valeurs ; l’iframe de simulation reste en place.

| Côté | Rôle | Contenu |
| --- | --- | --- |
| Haut | Situation | Indicateurs, alertes |
| Gauche | Navigation | Flotte, escadrons, missions, bibliothèque, disposition et aide |
| Droite | Inspection | Zone, escadron, drone ; détails progressivement dépliables |
| Bas | Actions et historique | Ordres de l’escadron, journal, relecture, bilans ; commandes de flotte permanentes |

Chaque panneau peut être replié, ouvert temporairement ou épinglé. Sur grand écran, l’épinglage réserve de l’espace autour de la scène ; un aperçu se superpose sans modifier sa largeur. Un seul aperçu temporaire est ouvert à la fois. Les aperçus haut/bas restent entre les panneaux latéraux épinglés. Sur petit écran, un seul panneau est affiché et l’épinglage ne réduit pas la scène.

Les largeurs gauche/droite se règlent par glissement ou par clavier (flèches, Début, Fin). Les onglets utilisent les rôles ARIA et une navigation clavier. Échap ferme un aperçu ; les champs et listes restent montés lorsqu’un onglet change. Les recherches révèlent l’onglet de destination.

Le style utilise des surfaces anthracite, un accent de sélection bleu et des couleurs distinctes pour les états. Les préférences proposent les densités Confort et Compact, conservées localement. Les sons existants et la réduction des animations sont conservés.

## Validation

- Build Vite réussi ; avertissements existants sur les scripts legacy et la taille du bundle de simulation.
- Test navigateur HUD : géométrie repli/aperçu/épinglage, largeur souris/clavier, exclusivité des aperçus, conservation du champ de recherche, onglets, recherche, densité persistée, même iframe, adaptation mobile, absence d’erreurs JS.
- Test navigateur navigation : clavier, accents, focus, fenêtres modales, ateliers, largeurs 1440/768/390 px.
- Test navigateur escadrons : décollage limité au membre sélectionné, séquence déplacement/attente/retour, dix autres drones inactifs, annulation et mobile.

Captures : [bureau](desktop.png), [mobile](mobile.png).

## Provenance

Cette étape réorganise le code source de l’application ; aucune nouvelle décompilation REA/Ghidra ni copie de code de jeu n’a été nécessaire. Les analyses REA antérieures restent documentées dans les dossiers de conception existants.

### Suite unitaire finale

206 tests réussis dans 18 fichiers (5,87 s), avec une configuration temporaire isolée désactivant HMR. Le démarrage de JSDOM a initialement pris plus d’une minute ; après son chargement, la suite complète s’est terminée avec succès. Aucun changement de dépendance n’a été nécessaire.

## Corrections après vérification complémentaire — 27 octobre 2026

- Reproduit puis corrigé : la case d’épinglage dans les réglages ne déclenchait pas le recalcul du HUD. Elle utilise désormais la même transition que le bouton du panneau.
- Une règle commune normalise les panneaux ouverts après redimensionnement, application d’un profil et changement d’épinglage. Sur mobile, un seul tiroir reste visible, même lorsqu’un profil prévoit plusieurs panneaux.
- Échap et le clic dans la carte prennent en compte le mode réellement affiché. Une préférence d’épinglage desktop n’empêche plus de fermer un tiroir mobile. Échap ferme également un aperçu lorsque le focus est dans un autre panneau épinglé.
- Sous 800 px de hauteur, les panneaux horizontaux fonctionnent en aperçu. Au-dessus, leur espace réservé est proportionné pour laisser au moins 300 px à la scène centrale lorsque les deux sont épinglés.
- Le profil Analyse épingle explicitement ses panneaux haut/bas sur les écrans adaptés.

Validation après correction : 206 tests unitaires / 18 fichiers, build Vite réussi, tests Chrome HUD, navigation, escadrons et nouveau test `command-center-hud-regression-browser.cjs` réussis. Aucun événement d’erreur JavaScript dans ces parcours. Le test de régression vérifie l’épinglage immédiat, la hauteur centrale, le passage desktop/mobile, Échap et l’application des profils sur mobile.

## Vérification ciblée : création d’escadron

Le test Chrome `command-center-squad-creation-browser.cjs` utilise des clics sur les contrôles visibles : ouverture du choix des drones, création nommée avec deux membres, création avec nom par défaut, rappel depuis le rail gauche, suppression et création mobile à 390 px. Il vérifie également le refus de création sans membre, l’absence de décollage et d’erreurs JavaScript.

Défaut reproduit puis corrigé : supprimer l’escadron actif sélectionnait un autre groupe dans la liste mais conservait les cases et marqueurs des anciens membres. La sélection est maintenant vidée puis restaurée depuis le nouvel escadron actif ; sans groupe restant, elle est vide. La suppression est aussi ignorée lorsqu’aucun groupe n’est actif ou que sa file est en cours.
