# Lisibilité de la console — 27 octobre 2026

- Console dimensionnée au viewport, en-tête/recherche fixes et contenu défilant indépendamment.
- Texte courant 14–15 px, champs à 16 px, titres à 21–26 px, boutons de console d’au moins 44 px.
- Catégories décrites sur ordinateur, navigation horizontale sur mobile, parcours clavier avec flèches/Début/Fin.
- Surfaces anthracite, action principale bleue, arrêt d’urgence distinct, focus visible et états désactivés.
- Ateliers spécialisés regroupés dans une section dépliable sans suppression de commandes.
- Polices et boutons du HUD légèrement agrandis.
- Correction d’un défaut de cadrage : les ateliers passent réellement au-dessus des bandeaux du HUD, sans en-tête ou bouton masqué.

Validation Chrome : 35 contrôles source / 35 contrôles conservés, synchronisation doctrine/altitude, création et suppression des balises, recherche clavier, huit catégories à 1440/768/390 px, huit ateliers sur ordinateur/tablette/mobile, agrandissement et masquage des panneaux, même moteur conservé et aucune erreur JavaScript.

Tests : `command-center-console-layout-browser.cjs` et `command-center-controls-browser.cjs`. Captures : [ordinateur](desktop.png), [mobile](mobile.png).
