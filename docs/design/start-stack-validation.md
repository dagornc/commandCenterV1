# Validation du démarrage — 25 octobre 2026

Le dépôt ne fournit pas de serveur métier séparé : le moteur de simulation s’exécute dans le navigateur. Le service backend utilisé est Ollama. Le nouveau `start.sh` lance ce service et Vite ; il permet aussi `--frontend-only`.

## Modifications

- Lanceur exécutable à la racine du dépôt et relais à la racine de l’espace de travail.
- Résolution des chemins indépendante du répertoire courant ; chemins avec espaces pris en charge.
- Vérification de Node, des dépendances et du port frontend avant lancement du backend.
- Réutilisation d’un Ollama répondant à `/api/tags`, attente bornée du backend créé.
- Port strict pour le démarrage combiné ; pas de changement silencieux d’URL.
- Frontend lié à `127.0.0.1` par défaut, `HOST` configurable.
- Arrêt des processus créés sur SIGINT/SIGTERM et échec d’un enfant ; backend préexistant conservé.
- Aucun téléchargement automatique de modèle ou installation automatique de dépendances.

## Résultats

- Démarrage réel d’Ollama 0.13.5 et de Vite sur le port 5552 : réussi. Ollama ne contient aucun modèle ; aucune inférence testée.
- `tests/start-stack-smoke.py` : démarrage depuis `/private/tmp`, HTTP frontend, registre vide, réutilisation d’Ollama, port occupé, port invalide, SIGINT, fermeture du frontend et maintien du backend préexistant : réussi.
- Tests unitaires : 193 réussis, 13 fichiers.
- Build production : réussi. Avertissements existants sur scripts historiques et taille du bundle.
- Parcours navigateur navigation, espaces de travail, commandes et stratégie : réussis sur le serveur lancé par `start.sh`. 35 commandes conservées, huit ateliers, moteur et brouillons conservés, mémorisation des vues, copie indépendante des ordres, progression, absence de lancement automatique, mobile et absence d’erreur JavaScript.
- Syntaxe Bash et `git diff --check` : réussis.

Le scénario SIGINT automatisé couvre un frontend créé et un backend réutilisé. Le démarrage d’un nouveau backend a été vérifié séparément ; sa fermeture suit le même gestionnaire mais n’a pas été testée séparément ici.
