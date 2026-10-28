export const controlLabels = {
  mission_type: "Doctrine de mission",
  mode_select: "Parcours de mission",
  "autonomy-slider": "Niveau d’autonomie",
  altitude_slider: "Altitude de vol (m)",
  safety_distance: "Distance de sécurité (m)",
  bounds_x: "Largeur du terrain (m)",
  bounds_y: "Profondeur du terrain (m)",
  "ollama-url": "Adresse du serveur Ollama",
  "llm-model-x500": "Modèle LLM X500",
  "llm-model-s500": "Modèle LLM S500",
  "llm-model-cf": "Modèle LLM Crazyflie",
  "llm-influence-slider": "Influence du LLM",
  "btn-place-beacon-click": "Placer une balise sur la scène",
  "btn-place-beacon-random": "Ajouter une balise aléatoire",
  "btn-place-beacon-3": "Ajouter trois balises",
  "btn-clear-beacons": "Effacer toutes les balises",
  "scenario-select": "Choisir un scénario",
  launchMission: "Lancer la mission",
  emergencyLand: "Arrêt d’urgence",
  takeoffAllDrones: "Faire décoller la flotte",
  landAllDrones: "Faire atterrir la flotte",
  returnToHome: "Retourner à la base",
  resetMission: "Réinitialiser toute la mission",
  resetLLMBrains: "Réinitialiser les cerveaux LLM",
  resetCamera: "Réinitialiser la caméra",
  topView: "Vue de dessus",
  zoomToSwarm: "Cadrer toute la flotte",
  toggleFollowMode: "Activer / quitter le suivi",
  togglePanel: "Ouvrir l’atelier complet",
  toggleMinimap: "Ouvrir les cartes",
  toggleDroneLabels: "Afficher / masquer les étiquettes 3D",
  toggleCommWaves: "Afficher / masquer les ondes de communication",
};
export const consequences = {
  resetMission:
    "Efface la couverture, les traces et la mémoire de mission, puis replace les drones au départ.",
  resetLLMBrains: "Efface la mémoire et les caches des agents LLM.",
  "btn-clear-beacons": "Supprime toutes les balises de la mission.",
  takeoffAllDrones: "Déclenche le décollage de tous les drones disponibles.",
  launchMission: "Fait décoller les agents au sol puis lance l’exploration.",
};
const translations = new Map(
  Object.entries({
    "Course of Action:": "Parcours de mission :",
    "Doctrine:": "Doctrine :",
    "Safety distance (m):": "Distance de sécurité (m) :",
    "Autonomy Mode": "Mode d’autonomie",
    Centralized: "Centralisé",
    Guided: "Guidé",
    Hybrid: "Hybride",
    "Semi-auto": "Semi-autonome",
    Autonomous: "Autonome",
    Distributed: "Distribué",
    Beacons: "Balises",
    "PoC Scenarios": "Scénarios de démonstration",
    "Ollama URL:": "Adresse Ollama :",
    "LLM influence:": "Influence du LLM :",
    "Requests:": "Requêtes :",
    "Failures:": "Échecs :",
    "Latency:": "Latence :",
    Cohesion: "Cohésion",
    Coordination: "Coordination",
    Stigmergy: "Stigmergie",
    Emergence: "Émergence",
    "Waiting for LLM decisions…": "En attente des décisions LLM…",
    "Status:": "État :",
    "Coverage:": "Couverture :",
    Active: "Actif",
  }),
);
export function translateLabel(text) {
  const trimmed = text.trim();
  return translations.has(trimmed)
    ? text.replace(trimmed, translations.get(trimmed))
    : text;
}
export const normalizeSearch = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
export function sourceKey(source) {
  return (
    source.id ||
    source.dataset.action ||
    (source.getAttribute("onclick") || "").split("(")[0]
  );
}
