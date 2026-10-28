# Tests UX/UI par cas d’usage — 27 octobre 2026

Sept parcours automatisés Chrome exécutés séquentiellement dans des profils isolés. Rapport détaillé : [results.json](results.json). Les durées sont celles de l’automatisation, pas des mesures du temps nécessaire à un utilisateur. Les actions de vol concernent uniquement le simulateur local.

| Cas d’usage | Critères vérifiés | Résultat |
| --- | --- | --- |
| Préparer puis lancer un balayage | Points, annulation, zone, confirmation, objectifs moteur, édition verrouillée en vol | Réussi |
| Créer et gérer un escadron | Membres obligatoires, nom libre/automatique, rappel, suppression cohérente, mobile | Réussi |
| Préparer une file sur mobile | Création, attente/retour, portée d’un agent, annulation, favori, réorganisation/suppression sans vol | Réussi |
| Retrouver un outil au clavier | Recherche avec accents, aucun résultat, focus, modales, ateliers | Réussi |
| Adapter le texte et réutiliser un favori | Taille/densité indépendantes et persistantes, portée, commandes désactivées, confirmation unique | Réussi |
| Replier sans perdre son travail | Champ conservé, épinglage, aperçu, redimensionnement clavier/souris, même iframe | Réussi |
| Console sur petit écran | 1440×900, 768×1024, 390×844, 320×568 et 844×390 ; clavier et retour du focus | Réussi |

Aucune erreur JavaScript relevée ni nouveau blocage fonctionnel reproduit. Les confirmations annulées et l’ouverture des favoris n’ont pas fait décoller la flotte. Le parcours de lancement explicite a exécuté sa mission simulée.

## Observations ergonomiques restantes

L’examen de la capture [file mobile](mobile-orders.png) suggère deux améliorations :

- Conserver le nom de l’escadron actif et son nombre de membres dans l’en-tête de la file, même après défilement, pour identifier la portée avant d’appuyer sur Exécuter.
- Ajouter un indicateur de défilement aux onglets horizontaux sur mobile, car les derniers onglets sont hors champ malgré leur accessibilité par défilement.

Ces observations ne sont pas des échecs des parcours et n’ont pas entraîné de modification fonctionnelle dans cette passe. Elles restent à confirmer par une session avec des utilisateurs humains ; cette vérification automatisée ne remplace pas une étude d’utilisabilité.

Reproduction depuis le frontend : `node tests/command-center-use-cases.cjs`.
