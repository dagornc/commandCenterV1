# Interface stratégique à quatre bords — 26 octobre 2026

La scène occupe le centre de la fenêtre. Les bords haut, gauche, droite et bas restent fixes. Les indicateurs, la flotte/outillage, l’inspecteur et le journal/bilans disposent chacun d’un bouton de repli avec aria-expanded et aria-controls. Leurs contenus défilent indépendamment. Les commandes de mission restent accessibles en bas.

Sur écran étroit, les panneaux latéraux deviennent des tiroirs superposés : l’ouverture de l’un ferme l’autre. La scène conserve sa place. Les raccourcis Préparer/Superviser/Escadrons révèlent l’inspecteur ; la recherche d’outils révèle les panneaux du journal et de la flotte. Échap replie le panneau contenant le focus et restitue ce focus à son bouton. Les réglages, l’aide, les exports et les bilans restent accessibles.

L’iframe du simulateur n’est ni déplacée ni recréée. Seuls les contrôles DOM sont réorganisés ; le cadrage reste indépendant des ordres de vol. Les préférences d’ouverture ne sont pas persistées : desktop démarre avec les côtés ouverts, mobile avec la scène dégagée.

## REA et sélection des mécanismes

Le CLI REA 6.7.0 a relu le bundle natif OpenTTD conservé dans `../rea-openttd-evidence.json` avec `inspect-evidence-bundle` : neuf preuves retenues, neuf correspondances, aucune révision inconnue. Résultat dans `rea-summary.json`.

La preuve Ghidra existante `ev_03a2922844e73809065f0b872fdca0f0ab9bd3397729220c498a69a3a3d27446`, `ExtraViewportWindow::OnClick` (0xee9da0), décrit des branches de zoom/transfert de cadrage. Le mécanisme pertinent retenu est de conserver un viewport indépendant des actions et panneaux. Cette preuve ne démontre pas une interface OpenTTD identique à celle implémentée et ne contient pas un classement des meilleurs codes de jeux.

Aucun nouvel exécutable de jeu analysé, aucun code décompilé copié, aucun nouvel usage du moteur Ghidra. L’architecture des quatre bords est écrite pour l’application. Les limites des analyses natives restent dans le bundle original. Le téléchargement OpenFront précédemment tenté était bloqué par HTTP 403 ; aucune extraction réussie n’est revendiquée.

## Vérification

- 201 tests existants passent (16 fichiers).
- Test Chrome dédié : quatre replis, dimensions centrales desktop, conservation d’un marqueur dans la fenêtre du simulateur, ouverture par raccourci, tiroirs mobiles exclusifs, aucun débordement horizontal à 390 px, aucune commande de vol déclenchée ni erreur JS.
- Captures desktop/mobile inspectées ; correction de la grille des raccourcis à deux colonnes dans le panneau gauche.
- Build de production réussi, avertissements historiques sur scripts non-module et bundle simulation volumineux.

Fichiers : `command-center/strategy-shell.js`, `strategy-shell.css`, intégration dans `app.js`, révélation des destinations dans `navigation-search.js`. Test : `tests/command-center-shell-browser.cjs`.
