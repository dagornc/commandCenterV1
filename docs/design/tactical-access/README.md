# Accès tactiques — 25 octobre 2026

## Changements de cette passe

- Barre de sept accès explicites : Préparer (P), Superviser (S), Escadrons (G), Voir la flotte (F), Vues mémorisées (V), Alerte suivante (A), Aide (?).
- Indication du contexte actif et consigne adaptée à la préparation, à la supervision ou aux escadrons.
- Parcours cyclique des alertes actuelles via leurs gestionnaires existants ; aucune commande de vol ajoutée à ces raccourcis.
- Raccourcis suspendus dans les champs de saisie, les éléments éditables, les dialogues et l’atelier complet. Même protection ajoutée aux touches numériques de rappel d’escadrons, y compris contre la répétition automatique.
- Présentation en sept colonnes sur grand écran, quatre sur écran intermédiaire, deux sur mobile ; état actif lisible et focus clavier conservé.

Fichiers concernés : `command-center/tactical-toolbar.js` (nouveau), `command-center/app.js` (import et initialisation), `command-center/styles.css` (styles ajoutés), `command-center/squads-ui.js` (garde clavier), `tests/command-center-tactical-toolbar-browser.cjs` (nouveau).
Les autres modifications déjà présentes dans le dépôt sont antérieures à cette passe.

## Références et statut des preuves

Les mécanismes sont adaptés au produit ; aucun classement des jeux les plus ergonomiques n’est établi et aucun asset de jeu n’est incorporé.

| Référence | Preuve / source | Adaptation |
| --- | --- | --- |
| shapez, HUD et raccourcis | [Analyse REA existante](../rea-game-reference.md), Evidence `ev_31d90aca4a0ebaadad4b537b19375ce0364ae6784fb7c3c545003cad55b4a3b7` ; observations statiques consignées sur toolbar, keybindings et dialogues | Accès regroupés, touches visibles, aide contextuelle, priorité aux dialogues |
| OpenTTD 15.3, navigation | [Bundle natif existant](../rea-openttd-evidence.json), Ghidra 12.1.4, Evidence `ev_03a2922844e73809065f0b872fdca0f0ab9bd3397729220c498a69a3a3d27446` | Accès au cadrage et aux vues sans émettre un ordre de mission |
| Age of Empires II | [Documentation officielle des raccourcis et groupes](https://www.ageofempires.com/learn-to-play/match-goals-aoe2/) ; pas de décompilation de ce jeu | Raccourcis proches de leurs commandes, accès aux escadrons |
| Factorio | [Description officielle de la quickbar](https://www.factorio.com/blog/post/fff-278) ; pas de décompilation de ce jeu | Emplacements stables pour accéder aux outils existants |

Le parcours des alertes et le choix des touches sont des décisions DIAMANTS, pas des comportements attribués à une fonction décompilée.

REA 6.7.0 a relu et validé le bundle exporté avec `inspect-evidence-bundle` : neuf enregistrements complets, résumé conservé dans [rea-evidence-summary.json](rea-evidence-summary.json). Les limites de décompilation restent celles des enregistrements originaux. Il s’agit de preuves antérieures réutilisées, pas d’une nouvelle analyse native.

Le diagnostic exécuté avec Node 24.22.1 confirme Ghidra 12.1.4, le décompilateur ARM64, le lanceur headless et Java 21.0.13 disponibles. L’enregistrement MCP Codex présente un écart de configuration : aucun changement de configuration effectué, utilisation de la CLI. Ghidra GUI démarré avec le lanceur officiel en mode `fg` : journal `Ghidra startup complete (3298 ms)`. Aucun binaire de jeu exécuté ni nouvelle session de décompilation ouverte.

## Validation

- Vitest : 193 tests réussis dans 13 fichiers. Un avertissement de port WebSocket interdit dans le bac à sable n’empêche pas la réussite des tests.
- Test navigateur ajouté, réussi sur serveur de développement puis sur le build de production : navigation, saisie, fenêtre modale, vues, parcours des alertes, absence de lancement automatique, desktop/mobile sans débordement, aucune erreur JavaScript.
- Régression espaces de travail : brouillons, file d’ordres et moteur conservés ; sélection de cible ; ordinateur/tablette/mobile.
- Régression commandes : 35 commandes source / 35 commandes miroir, huit ateliers, recherche, balises, doctrine/altitude, même moteur.
- Build de production réussi en 3,8 secondes dans `/private/tmp/diamants-tactical-production-20261025`. La compilation vers le dossier `dist` préexistant avait échoué au nettoyage avec `ENOTEMPTY` ; ce dossier n’a pas été supprimé manuellement.
- Avertissements de build : scripts historiques non modules et bundle du simulateur supérieur à 500 kB.

Ces vérifications ne constituent pas une mesure d’efficacité ergonomique auprès d’utilisateurs ni une couverture exhaustive du simulateur.
