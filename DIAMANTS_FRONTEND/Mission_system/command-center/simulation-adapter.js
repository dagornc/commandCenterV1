/** Read-only telemetry boundary. Missing values remain null, never invented. */
export const phaseLabels = {
  EXPLORE: "Exploration",
  LAND: "Atterrissage",
  IDLE: "Au sol",
  LANDED: "Au sol",
  TAKEOFF: "Décollage",
  HOVER: "En station",
  EXPLORING: "Exploration",
  EXPLORATION: "Exploration",
  RETURNING: "Retour base",
  RETURN_HOME: "Retour base",
  RETURN_TO_HOME: "Retour base",
  LANDING: "Atterrissage",
  EMERGENCY: "Urgence",
  EMERGENCY_STOP: "Arrêté",
  NAVIGATING: "En transit",
  MOVING: "En transit",
};
export const finite = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
export function isAirborne(drone) {
  return drone.position?.y > 0.5 && !["IDLE", "LANDED"].includes(drone.phase);
}
export function normalizeDrone(drone, state, index) {
  const source = state?.position || drone.mesh?.position || drone.position;
  const position =
    source && [source.x, source.y, source.z].every((v) => finite(v) !== null)
      ? { x: source.x, y: source.y, z: source.z }
      : null;
  const velocity = state?.velocity || drone.velocity;
  const speed =
    velocity &&
    [velocity.x, velocity.y, velocity.z].every((v) => finite(v) !== null)
      ? Math.hypot(velocity.x, velocity.y, velocity.z)
      : null;
  const battery = finite(state?.battery ?? drone.battery);
  const id = String(drone.id ?? `agent_${index + 1}`);
  return {
    id,
    index,
    name: id
      .replace(/_/g, " ")
      .replace(/crazyflie/i, "CF")
      .toUpperCase(),
    model: String(
      drone.profileLabel || drone.droneProfile || drone.type || "Non renseigné",
    ),
    role: String(drone.agentRole || "Agent autonome"),
    phase:
      state?._returningToBase && state.phase === "EXPLORE"
        ? "RETURN_HOME"
        : String(state?.phase || drone.state || "UNKNOWN"),
    position,
    speed,
    battery: battery === null ? null : Math.max(0, Math.min(100, battery)),
    sensorCritical: Array.isArray(state?.sensorAlerts?.critical)
      ? state.sensorAlerts.critical.length
      : 0,
    sensorWarnings: Array.isArray(state?.sensorAlerts?.warning)
      ? state.sensorAlerts.warning.length
      : 0,
    action: String(state?._lastAction || ""),
    decision: String(state?._lastDecision || ""),
    heading: finite(state?.heading) ?? 0,
    waypoint: state?.waypoint
      ? { x: state.waypoint.x, z: state.waypoint.z }
      : null,
  };
}
export function getSnapshot(win) {
  const system = win?.diamantsSystem;
  const controller = system?.integratedController;
  const engine = controller?.autonomousFlightEngine;
  const source = controller?.drones || system?.drones || [];
  const drones = source.map((drone, index) =>
    normalizeDrone(drone, engine?.drones?.get(drone.id), index),
  );
  const coverage = finite(controller?.metrics?.coveragePercentage);
  const halfBounds = engine?._getHalfBoundsXZ?.() || {
    x: engine?.explorationBounds ?? 60,
    z: engine?.explorationBounds ?? 60,
  };
  const forest = system?.scene?.getObjectByName?.("Forest");
  return {
    ready: !!(system?.renderer && engine?.drones?.size > 0 && drones.length),
    running: !!controller?.isRunning,
    started: !!controller?.missionStarted,
    drones,
    coverage: coverage === null ? null : Math.max(0, Math.min(100, coverage)),
    trees: (forest?.children || system?.environment?.trees || []).map((t) => ({
      x: t.position.x,
      z: t.position.z,
    })),
    visited: engine?.visitedCells || new Set(),
    cellSize: finite(engine?.cellSize) ?? 5,
    halfBounds,
    zoneRadius: Math.max(halfBounds.x, halfBounds.z),
  };
}
const commands = {
  launch: "launchMission",
  takeoff: "takeoffAllDrones",
  land: "landAllDrones",
  return: "returnToHome",
  stop: "emergencyLand",
};
export function executeCommand(win, command) {
  if (!getSnapshot(win).ready)
    throw new Error("Le moteur de simulation n’est pas encore prêt.");
  const method = commands[command];
  if (!method || typeof win[method] !== "function")
    throw new Error("Cette commande n’est pas disponible dans le simulateur.");
  if (win[method]() === false)
    throw new Error("Le simulateur a refusé la commande. Consultez son état.");
}
export function filterDrones(drones, query, filter) {
  const search = query.trim().toLocaleLowerCase("fr");
  return drones.filter(
    (d) =>
      `${d.id} ${d.name} ${d.model}`.toLocaleLowerCase("fr").includes(search) &&
      (filter === "all" ||
        (filter === "airborne" ? isAirborne(d) : !isAirborne(d))),
  );
}
