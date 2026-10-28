# Boucle ergonomique 2 — 25 octobre 2026

## Implémentation

- Accès Superviser : nombre réel de drones en vol ; télémétrie indisponible explicitement signalée.
- Accès Escadrons : files réellement en cours / groupes créés ; mise à jour à la création, exécution et annulation.
- Accès Alertes : nombre critique et total, puis disparition de l’indicateur critique lorsque le problème est résolu.
- Inspecteur : actions Centrer sur la carte et Suivre en 3D regroupées près de l’identité de l’agent. Portée nominative explicite. Ces actions ne donnent pas d’ordre de vol.
- Observateurs de changements existants, aucun nouveau timer de scrutation ; boutons conservés sans recréation et raccourcis inchangés.

## Utilisation effective de REA

CLI REA 6.7.0, Node 24.22.1 : `inspect-evidence-bundle` a relu et validé les neuf enregistrements du bundle natif OpenTTD. [Résumé retourné](rea-summary.json). Les [métadonnées ciblées](rea-selected-metadata.json) renvoient aux enregistrements complets du [bundle original](../rea-openttd-evidence.json).

- `ExtraViewportWindow::OnClick`, 0xee9da0, Evidence `ev_03a2922844e73809065f0b872fdca0f0ab9bd3397729220c498a69a3a3d27446` : branches distinctes de zoom et transfert de cadrage. Adaptation : bouton de centrage explicite, séparé des ordres de mission.
- `DrawOrderString`, 0xd41aa0, Evidence `ev_5e612461de480cfc01f46354671bafd15c8a27ecf07fc8b8f40ae5a18078129a` : comparaison de l’index d’ordre et dessin conditionnel d’indicateurs. Adaptation : état d’exécution visible. L’agrégation du nombre d’escadrons actifs est un choix DIAMANTS, pas une fonctionnalité démontrée par cette fonction.
- [Analyse shapez antérieure](../rea-game-reference.md) : référence historique pour les outils contextuels. Le dossier de distribution temporaire est désormais vide ; aucune nouvelle analyse shapez revendiquée.

Ces preuves viennent d’analyses Ghidra antérieures, réutilisées conformément au workflow REA ; aucune nouvelle décompilation ni exécution de jeu. Les limites de types, de flux et de couverture figurent dans les enregistrements. Les preuves ne reconstituent pas les sources originales. Aucun code ou asset de jeu incorporé.

## Références récentes

[Frostpunk 2, présentation développeur de l’interface console](https://news.xbox.com/en-us/2025/09/18/adapting-frostpunk-2s-depth-to-a-gamepad/) documente les actions contextuelles et les indicateurs de progression dans la navigation. Cette source éclaire la proposition récente ; elle n’a pas été analysée avec REA. OpenTTD et shapez restent des références complémentaires plus anciennes, pas des jeux sortis après 2023.

## Validation

196 tests unitaires réussis, 14 fichiers. Build réussi avec avertissements existants sur scripts historiques et taille du bundle. Les gains de temps utilisateur ne sont pas encore mesurés.

Parcours navigateur réussis : compteurs zéro/critique/résolu, création/exécution/annulation d’escadron, centrage sans ordre de vol, conservation du cadrage de sélection, explications des commandes, raccourcis tactiques et 35 commandes / huit ateliers. Vérifications 1440/768/390 px sans débordement ni erreur JavaScript. Capture mobile inspectée.
