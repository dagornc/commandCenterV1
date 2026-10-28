# Contexte des ordres et accès aux onglets — 28 octobre 2026

Le titre du panneau inférieur affiche le nom et l’effectif de l’escadron actif lorsque l’onglet Ordres est sélectionné. Ce titre reste hors de la zone défilante ; il suit la sélection, les changements de membres et la suppression. Les autres onglets retrouvent le titre Actions & historique. Les changements sont annoncés poliment aux lecteurs d’écran.

Les listes d’onglets horizontales du HUD et les catégories de la console disposent de flèches de défilement. Elles sont affichées uniquement en cas de débordement et désactivées à chaque extrémité. Le clavier et le défilement direct restent disponibles ; un onglet recevant le focus est ramené dans la zone visible.

Validation : test dédié `command-center-context-scroll-browser.cjs`, capture mobile examinée, sept parcours de `command-center-use-cases.cjs` rejoués, build Vite réussi. Le test de préférences attend désormais la présence du sélecteur de taille de texte après rechargement, plutôt que seulement la disponibilité du moteur, pour éviter une vérification prématurée de l’interface.

Capture : [mobile](mobile.png).
