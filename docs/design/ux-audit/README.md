# Audit UX/UI — 27 octobre 2026

Vérification dans Chrome avec profils temporaires : bureau 1440×900, tablette 768×1024, mobile 390×844, petit mobile 320×568, paysage 844×390. Captures examinées visuellement. Aucun lancement de mission effectué dans ces parcours.

## Corrections

1. Les trois icônes de l’inspecteur exposent maintenant leur état sélectionné (`aria-pressed` synchronisé avec les contrôles d’origine), leur panneau cible et un repère visuel bleu.
2. Une recherche dans la console affiche seulement ses résultats. Les commandes de la catégorie précédente et les raccourcis annexes sont masqués pendant la recherche et réapparaissent quand elle est effacée ; le cas sans résultat n’affiche plus des commandes sans rapport.
3. Sous 500 px de hauteur, l’en-tête est compacté ; les champs et boutons conservent leur taille. Le test impose au moins 220 px de contenu utilisable au format 844×390.

## Validation

Quatre parcours navigateur réussis : audit UX dédié, console responsive, régressions HUD, recherche/navigation. Ils couvrent notamment les huit catégories, les contrôles conservés, le clavier, les modales, la restauration du focus, l’épinglage, les profils, la recherche sans résultat et l’absence d’erreurs JavaScript. Compilation Vite réussie ; avertissement existant sur le poids du bundle. Ces contrôles ne constituent pas une certification d’accessibilité ni une étude utilisateur.

## Propositions, non implémentées

- Réglage indépendant de taille du texte (100 %, 115 %, 130 %) : dissocier lisibilité et densité ; vérifier chaque niveau avec les mêmes parcours de débordement.
- Guidage de création d’escadron : trois étapes visibles « Membres → Nom → Créer », compteur permanent et accès direct au choix des drones si aucun membre n’est sélectionné.
- Favoris et commandes récentes : accès rapide à quelques contrôles choisis par l’utilisateur, avec rappel explicite de leur portée flotte/escadron/agent et maintien des confirmations existantes.
