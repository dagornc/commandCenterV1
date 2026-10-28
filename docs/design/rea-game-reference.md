# Référence de jeu analysée avec REA

Date : 16 octobre 2026. Cible : distribution publique navigateur de **shapez**, build `8a79de52`, téléchargée depuis https://shapez.io/. L'utilisateur n'a pas de jeu installé et a autorisé une référence publique. L'objectif est de transposer des principes HUD vers le simulateur de flotte DIAMANTS.

## Preuve et méthode

Skill suivi : https://github.com/morluto/rea, `reverse-engineer-anything`, version 42. REA CLI **6.5.0**, runtime existant Node **24.19.0**. Aucun paramètre Codex/MCP modifié, aucun moteur natif installé.

Commande effectivement terminée avec code 0 :

```sh
rea analyze-javascript-application /private/tmp/rea-shapez-public --json
```

Evidence : `ev_31d90aca4a0ebaadad4b537b19375ce0364ae6784fb7c3c545003cad55b4a3b7`.

- Entrées : index.html, bundle.js, main.css.
- Bundle : https://shapez.io/v/8a79de52/bundle.js
- CSS : https://shapez.io/v/8a79de52/main.css
- SHA-256 du bundle : `6219f60f736c32f2e9ce2414d042606f80e7a58929f1f5407cb84da6a274c541`.
- 354 891 nœuds AST parcourus, 1 fichier JavaScript analysé, 0 échec de parsing.
- Evidence complète locale (~78 Mo) : `/private/tmp/rea-shapez-evidence-complete.json`.
- Extrait traçable et léger : [rea-shapez-evidence-excerpt.json](rea-shapez-evidence-excerpt.json). Cet extrait n'est pas une nouvelle Evidence REA.

La première tentative a été interrompue par l'interdiction d'écriture du cache Swift du helper REA. Après autorisation d'escalade, l'analyse a réussi. Le diagnostic constate une absence d'enregistrement MCP ; le chemin CLI fonctionne indépendamment.

## Observations et transpositions

Les identités et positions ci-dessous viennent du graphe sémantique REA. Les conditions et règles de présentation ont ensuite été vérifiées par lecture ciblée des fichiers distribués, sans exécuter le jeu.

| Élément observé | Preuve | Décision de design pour DIAMANTS |
|---|---|---|
| Toolbar avec catégories primaires/secondaires et condition de visibilité liée à la couche et à la vue carte | Fonction `HUDBaseToolbar`, ligne 2 colonnes 1973261–1973581 ; `HUDBuildingsToolbar`, ligne 2 colonnes 2140533–2140839 ; IDs conservés dans l'extrait | Barre d'outils attachée à la carte ; actions adaptées au mode et à la sélection. Garder les commandes principales visibles et grouper les secondaires. |
| Repères avec centre de caméra, zoom et couche ; création via raccourci clavier | Fonction `waypoints_initialize`, ligne 2 colonnes 2014435–2015366 | Boutons pour recentrer sur la flotte, le drone sélectionné et la zone mission ; garder la sélection lors du changement de couche. |
| Notifications alimentées par signaux, typées, affichées dans un emplacement fixe | Fonction `notifications_initialize`, ligne 2 colonnes 1976083–1976335 ; lecture CSS du HUD notifications | Flux d'événements horodatés avec gravité, statut et objet concerné. Confirmation visuelle discrète pour les commandes. |
| Statistiques avec modes détaillé, icônes, tri, unité ; état actif visible | Lecture directe du CSS livré, sélecteurs HUD Statistics ; ce constat de style n'est pas un résultat AST REA | Liste de flotte filtrable et panneau de télémétrie détaillé à la sélection ; unités explicites et état actif lisible. |
| Échelle d'interface centralisée ; listes de repères bornées en hauteur et défilantes | Lecture directe du CSS livré | Densité contrôlée, panneaux bornés, carte conservant l'espace principal et défilement dans chaque panneau. |

Ces transpositions sont des choix de conception, pas une reproduction du comportement du jeu. Les références XCOM / Homeworld / EVE évoquées dans la conversation restent des inspirations conceptuelles : elles n'ont pas été analysées avec REA dans cette investigation.

## Couverture et inconnus

Analyse statique uniquement : aucune preuve de comportement en exécution, aucune capture interactive du jeu. REA signale une couverture partielle, un plafond de 20 000 nœuds sémantiques par fichier, des relations dynamiques non résolues et un corps JavaScript inline HTML non analysé. L'absence d'un objet dans ce graphe ne démontre pas son absence du jeu. Les fichiers de ressources paresseusement chargés et les fonctionnalités hors des trois fichiers téléchargés ne sont pas couverts.

La sélection de groupes et les interactions de commande de drones relèvent du design DIAMANTS, pas de conclusions tirées de shapez.

## Réutilisation

Seuls les principes d'interaction sont transposés, avec une implémentation originale. Aucun sprite, logo, police, son, code minifié ou CSS du jeu n'est intégré au produit. Les fichiers téléchargés restent dans `/private/tmp`. La licence du dépôt amont est consultable à https://github.com/tobspr-games/shapez.io/blob/master/LICENSE ; elle ne sert pas à affirmer que chaque asset de la distribution a une autorisation de réutilisation indépendante.

## Extension : organisation du panneau complet (17 octobre 2026)

Cette passe réutilise l’Evidence REA complète ci-dessus, sans relancer une analyse identique. Les fonctions sont sélectionnées dans `normalized_result.semantic_graph.nodes`, puis leur corps est relu dans le bundle identifié par son SHA-256. Les colonnes du graphe sont en unités UTF-16 ; leur conversion est conservée lors de la lecture. Aucun jeu n’a été exécuté pendant cette passe.

| Observation statique vérifiée | Position dans `bundle.js`, ligne 2 | Transposition proposée pour DIAMANTS |
|---|---|---|
| `base_toolbar_update` recalcule la disponibilité des outils et celle de la barre secondaire en fonction de l’état du jeu. | colonnes 1970558–1971068 ; nœud `jsrg_node_ec294987e3fb6b773506cf9942b3d3d38f56be1f4047f20a59f9e28fdde428a5` | Organiser toutes les fonctions par contexte : mission, flotte, capteurs, environnement, diagnostic. Conserver les commandes de vol au même endroit ; expliciter les prérequis des actions indisponibles. |
| `keybindings_onEnter` construit une liste de raccourcis par catégorie, avec libellé, touche, édition et réinitialisation ; certains raccourcis intégrés sont verrouillés. | colonnes 2220397–2221642 ; nœud `jsrg_node_15128a289f768bdbf64b77158c103a8e846dc06771f787e65d4cfc9f36fdda3b` | Une aide clavier par catégorie rend les nombreuses commandes découvrables. Une commande reste accessible au pointeur et au clavier ; les touches sont affichées près de l’action. La personnalisation n’est pas requise pour la première couverture. |
| `modal_dialog_elements_handleKeydown` dirige les touches de confirmation et d’annulation vers les gestionnaires du dialogue courant. | colonnes 1810838–1811089 ; nœud `jsrg_node_db5a61a55bf6dcd9779769bece0f2b29fe1eb02ea2604c9f9aae8a9095b65ca0` | Échap ferme le panneau ou annule l’outil actif. Les raccourcis de vol ne traversent pas un champ de saisie ou un dialogue. La réinitialisation destructive conserve une confirmation explicite. |
| `settings_menu_show` place son récepteur d’entrée au premier plan et actualise les statistiques avant présentation. | colonnes 2172289–2172942 ; nœud `jsrg_node_f7fc1cb9e09bbc9a0fdc0333026d4b5937da883d75604f6810ef4156858f542b` | Les réglages avancés forment un espace dédié ; leurs valeurs sont relues depuis le moteur à l’ouverture. La saisie a priorité sur les commandes globales. |
| `_moveToWaypoint` restaure couche, centre et zoom ensemble ; `_rerenderWaypointList` sépare clic sur repère et édition au moyen de `targetOnly`. | colonnes 2016498–2016668 et 2015713–2016498 ; nœuds `jsrg_node_285f93e77fdb668cb2aa82ebfd6db6a4f35e34c68dccdc176f867598fc37793c` et `jsrg_node_e9d6e7857026c913ecbee3616b6d5ef311c3310b29c4a3ad0ad1ef5efd4b94bb` | Restaurer un contexte de carte cohérent lors de la navigation vers un agent ou une mission. Cliquer sur une action secondaire de ligne ne doit pas déclencher aussi l’action principale de la ligne. |

### Décisions et limites

Ces faits établissent des mécanismes d’interface dans un artefact distribué, pas une supériorité ergonomique mesurée. L’expression « les jeux les plus ergonomiques du monde » ne correspond à aucun classement démontré par cette investigation. Shapez est ici une référence concrète pour la gestion d’une interface dense ; les autres titres restent des pistes, sans attribution REA.

La couverture de toutes les commandes DIAMANTS doit être prouvée séparément par un inventaire du panneau original et des tests de chaque commande. La découverte progressive organise cette couverture : elle ne justifie pas de supprimer une fonction. Les transpositions ci-dessus sont des décisions proposées, dont l’implémentation et la validation doivent être suivies dans le bilan de couverture du produit.
