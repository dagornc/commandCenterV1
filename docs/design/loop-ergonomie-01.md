# Boucle ergonomique 1 — 25 octobre 2026

## Hypothèses et modifications

1. Comparer plusieurs drones doit conserver le secteur observé. La sélection ordinaire ne déclenche plus `focusAgent()`. Sélectionner un autre drone pendant le suivi quitte ce suivi en conservant centre et zoom. Le bouton Centrer reste disponible ; cliquer une alerte conserve son recentrage explicite.
2. Les commandes indisponibles doivent être expliquées. Un panneau dépliable dans les accès tactiques indique les raisons pour chaque commande de flotte, reliées aux boutons via `aria-describedby` et leur titre. Le même prédicat pilote la désactivation et l’explication : connexion absente, mission active, retour en cours, flotte au sol, décollage déjà effectué. Les escadrons indiquent localement la prochaine étape et la portée de la file prête.

Aucune commande de mission ajoutée ou retirée ; aucun changement au moteur de vol.

## Boucle de vérification

- Hypothèse → modification ciblée → tests automatiques → correction du test de régression → nouvelle vérification.
- 196 tests unitaires réussis, 14 fichiers, dont les règles de disponibilité au sol, en vol, pendant un retour et sans moteur.
- Nouveau parcours navigateur : trois sélections gardent centre et zoom, recentrage explicite opérationnel, changement de sélection quitte le suivi, raisons flotte et escadron adaptées, aucun décollage, 1440/390 px sans débordement ni erreur JavaScript.
- Parcours alertes réussi : recentrage de l’agent critique et suppression de l’alerte résolue.
- Compilation réussie, avertissements existants sur scripts historiques et taille du bundle.
- Captures desktop/mobile produites ; capture mobile inspectée.
- Le test des commandes utilisait un profil persistant et supposait le panneau réduit. Ce conflit a été corrigé en utilisant le profil temporaire isolé de Puppeteer.

Ce sont des validations fonctionnelles. Le gain de temps, la réduction des erreurs et la préférence des utilisateurs restent à mesurer ; aucune étude utilisateur n’est revendiquée.

## Origine des choix

La séparation sélection/recentrage est inspirée des corrections documentées de [Homeworld 3, patch 1.3](https://www.homeworlduniverse.com/homeworld-3-patch-1-3-update-notes/). L’explication progressive s’inspire des infobulles documentées de [Civilization VII](https://steamcommunity.com/games/1295660/announcements/detail/688631746613215318?l=finnish). Les messages et règles restent propres à DIAMANTS. Aucun nouveau travail de décompilation dans cette passe.

Régressions après isolation du profil : commandes (35/35 et huit ateliers), recherche/navigation et espaces de travail réussies ; moteur, brouillons et files conservés, ordinateur/tablette/mobile, sans erreur JavaScript.
