# Repères de carte et suivi des ordres — 25 octobre 2026

## Fonctionnalités livrées

- Six repères de carte nommés, conservant centre, zoom et calques. Enregistrement local validé ; stockage indisponible signalé. Rappeler une vue ne lance aucune mission.
- Copie indépendante d’une file d’ordres vers un autre escadron, ajoutée aux ordres existants, dans la limite de 48. Modifier la copie ne modifie pas l’original.
- État de chaque ordre : à venir, en cours, terminé ou annulé. Compteurs issus des positions/phases réelles ; compte à rebours des attentes, sans estimation fictive de trajet.
- Recentrage sur l’objectif actif et repère visible sur la carte.
- Espacement de défilement tenant compte de la barre de commandes fixe et des onglets du panneau.

Implémentation originale, sans ressources ni code du jeu incorporés.

## Origine des choix

Les repères reprennent le principe de restauration cohérente centre/zoom/calques observé dans la distribution de shapez avec REA : Evidence `ev_31d90aca4a0ebaadad4b537b19375ce0364ae6784fb7c3c545003cad55b4a3b7`. Voir [le rapport et ses limites](rea-game-reference.md).

Corroboration par lecture du code source officiel OpenTTD 15.3 (distincte de la rétro-ingénierie binaire) :

- [viewport_gui.cpp](https://github.com/OpenTTD/OpenTTD/blob/15.3/src/viewport_gui.cpp), `ExtraViewportWindow::OnClick` : commandes de zoom et transfert de cadrage entre vues. Transposition : rappeler un secteur et centrer l’objectif sans commander les drones.
- [order_gui.cpp](https://github.com/OpenTTD/OpenTTD/blob/15.3/src/order_gui.cpp), `DrawOrderString` : distinction de l’ordre courant ; logique de copie dans les interactions des ordres. Transposition : progression lisible et copie indépendante. Les règles de vol restent propres à DIAMANTS.

Ces éléments ne constituent pas une mesure comparative de l’ergonomie des jeux.

## Investigation native REA / Ghidra

Skill REA version 46, REA 6.7.0, Node 24.22.1, Ghidra 12.1.4 et Temurin 21.0.13+9. Le décompilateur ARM64 macOS a été compilé depuis les sources de cette distribution Ghidra. Diagnostic REA sain ; aucun changement de configuration MCP/Codex.

Cible publique officielle : [OpenTTD 15.3 Linux amd64](https://cdn.openttd.org/openttd-releases/15.3/openttd-15.3-linux-generic-amd64.tar.xz).

- Archive SHA-256 vérifié : `f49eb25d61b00f8f4d332fee02b530ad75552d1efb8f2bb01e7ca5e6540fe059`.
- Exécutable ELF, 59 401 416 octets, SHA-256 `276d5b698a6b706154f3af588f6f885b3aebe518f4ecc8f869abf71383b1904c`.
- Build ID `98bb204cedf90a70502c373d94691d605a003462` ; symboles de débogage DWARF absents.
- Deux requêtes initiales ont expiré au délai de démarrage de 330 000 ms. Aucune conclusion de décompilation ne peut en être tirée.
- `close_binary` a réussi, puis une nouvelle session a été ouverte avec `REA_GHIDRA_STARTUP_TIMEOUT_MS=1800000`, conformément au guide de récupération REA.
- La nouvelle analyse automatique a terminé, puis les requêtes ciblées ont réussi. Inventaire natif : Evidence `ev_3a19ae067c2f1a3e4546c7bfbebb379dbb93fb46752942ec1a1b61b9f39d9b43`.
- [Bundle REA exporté](rea-openttd-evidence.json) : neuf enregistrements complets, avec identité du binaire, profils, pseudocode et limites. L’absence d’inconnus enregistrés dans l’export n’implique pas une couverture exhaustive du jeu.

### Preuves natives ciblées

| Fonction / adresse | Observation Ghidra | Transposition DIAMANTS |
|---|---|---|
| `ExtraViewportWindow::OnClick`, `0xee9da0` | Branches de zoom et transfert des positions de cadrage avec compensation des dimensions ; la branche vers la vue principale réinitialise un identifiant de suivi. Evidence `ev_03a2922844e73809065f0b872fdca0f0ab9bd3397729220c498a69a3a3d27446`. Les noms des champs sont corroborés par le source du même tag. | Navigation explicite vers un cadrage ou un objectif, séparée des commandes de mission. |
| `DrawOrderString`, `0xd41aa0` | Comparaison de l’index affiché avec deux index du véhicule et un ou deux appels de dessin de sprite ; choix de couleur selon le paramètre de sélection. Evidence `ev_5e612461de480cfc01f46354671bafd15c8a27ecf07fc8b8f40ae5a18078129a`. Le source identifie les index réel/implicite et les flèches. | Ordre actif visible, distingué des ordres à venir et terminés, sans dépendre seulement de la couleur. |
| `OrdersWindow::OnVehicleSelect`, `0xd47ed0` et `0xd4a580` | Branches conditionnées par Ctrl/le mode ; comparaison des listes et erreurs lorsque les sources diffèrent ; paramètre distinct transmis à la commande. Evidence `ev_7cb84f27f954a62b0cd92696833f5c52b2eb4e4460761696bc30a3a1c73e9034` et `ev_c9775511223cf1e40731022b93582b68b71abdcceb92df43e67e87049d58cdd0`. Le source permet d’interpréter copie et partage. | Copie indépendante explicitement choisie dans une liste source. DIAMANTS ajoute la copie à la file existante ; cette règle est une décision propre au produit, différente de la précondition OpenTTD. |

Les fonctions ont été recherchées par leurs symboles exportés encore présents malgré l’absence de DWARF. La décompilation ne reconstitue pas les types source avec certitude. Des avertissements globaux concernent des instructions, piles et données supposées GIF/PNG non résolues. Les Evidence ciblées conservent les limites de flux terminal de Ghidra ; aucune exhaustivité des appels indirects ni observation d’exécution n’est revendiquée.

Les preuves ont été exportées avant fermeture ; `close_binary` a réussi. Le binaire du jeu n’a pas été exécuté. Une analyse statique ne démontre pas son comportement à l’exécution.

## Validation

- 193 tests unitaires, 13 fichiers : réussis.
- Compilation de production : réussie, avertissement de taille de bundle existant.
- Parcours navigateur des nouvelles fonctions : sauvegarde/rappel/rechargement, absence de lancement automatique, indépendance de la copie, progression réelle, mobile, aucune erreur JavaScript : réussi.
- Parcours espaces de travail : modes, conservation des brouillons et du moteur, sélection de cible, panneaux contextuels, 1440/768/390 px : réussi. Le test centre les contrôles avant les clics souris pour éviter qu’un élément considéré visible par Puppeteer soit recouvert par la barre fixe.

- Parcours escadrons : décollage limité à la sélection, déplacement/attente/retour, autres drones immobiles, annulation, mobile : réussi.
- Commandes et ateliers : 35 commandes miroir et huit ateliers sur ordinateur/tablette/mobile, moteur conservé : réussi.

- Redimensionnement souris : aperçu, synchronisation moteur/champs, annulation Échap et verrouillage en vol : réussi.
- Restauration des préférences, inspecteur, calques et plan, effacement persistant, absence de lancement automatique : réussi.

Les autres validations sont consignées séparément ; ces résultats ne prétendent pas couvrir toutes les combinaisons du simulateur.
