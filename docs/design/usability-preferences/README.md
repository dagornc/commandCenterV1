# Préférences, création guidée et raccourcis — 27 octobre 2026

Implémentés dans l’ordre proposé :

1. Taille du texte à 100 %, 115 % ou 130 % dans Préférences, mémorisée localement et indépendante de Confort/Compact. La typographie de l’interface HTML suit le facteur ; la scène du simulateur conserve son rendu.
2. Création d’escadron avec repères Membres → Nom facultatif → Créer, choix des membres ouvert, compteur, indication de réussite et retour au choix des membres en cas de sélection vide. Les contrôles existants et les raccourcis de groupe sont conservés.
3. Section Favoris et commandes récentes dans Ouvrir les commandes. Catalogue : lancement, décollage, atterrissage, retour de flotte ; exécution de la file d’escadron ; préparation de déplacement/retour de l’agent sélectionné. Favoris et cinq accès récents sont conservés localement. Chaque action affiche sa portée actuelle ; les commandes indisponibles sont désactivées. Les raccourcis appellent les contrôles d’origine et conservent leur prévisualisation. Les récents indiquent un accès à une commande, pas une preuve d’exécution.

Validation : test dédié pour persistance après rechargement, indépendance densité/taille, guidage et erreur sans membres, portée actuelle, indisponibilité sans ordres, maintien d’une seule confirmation sans décollage, trois tailles de texte × quatre largeurs (1440, 768, 390, 320). Tests existants de création d’escadron et de console également réussis. 206 tests unitaires réussis dans 18 fichiers ; build Vite réussi. Un débordement à 130 % sur mobile a été corrigé par retour à la ligne des raccourcis.

Capture : [mobile à 130 %](mobile-130.png).
