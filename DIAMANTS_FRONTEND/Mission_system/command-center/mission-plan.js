/** Mission targets guide exploration; they are not a flight containment boundary. */
export function validatePlan(plan, bounds) {
  if (!plan.points.length) throw new Error("Ajoutez au moins un objectif.");
  if (plan.points.length > 24) throw new Error("24 objectifs maximum.");
  for (const p of plan.points) {
    if (
      ![p.x, p.z].every(Number.isFinite) ||
      Math.abs(p.x) > bounds.x ||
      Math.abs(p.z) > bounds.z
    )
      throw new Error("Placez les objectifs dans la zone du simulateur.");
  }
  return plan;
}
export function surveyPoints(a, b) {
  const minX = Math.min(a.x, b.x),
    maxX = Math.max(a.x, b.x);
  const minZ = Math.min(a.z, b.z),
    maxZ = Math.max(a.z, b.z);
  if (maxX - minX < 5 || maxZ - minZ < 5)
    throw new Error("Choisissez une zone d’au moins 5 × 5 m.");
  return Array.from({ length: 9 }, (_, i) => ({
    x: minX + ((i % 3) * (maxX - minX)) / 2,
    z: minZ + (Math.floor(i / 3) * (maxZ - minZ)) / 2,
  }));
}
export function createPlanProvider(points, ids) {
  const targets = points.map((p) => ({ ...p }));
  const cursors = new Map(ids.map((id, i) => [id, i % targets.length]));
  return (id, state) => {
    let index = cursors.get(id) ?? 0;
    let p = targets[index];
    if (Math.hypot(state.position.x - p.x, state.position.z - p.z) < 3) {
      index = (index + 1) % targets.length;
      cursors.set(id, index);
      p = targets[index];
    }
    return { ...p, _label: `Objectif ${index + 1} / ${targets.length}` };
  };
}
export function describeIntent(drone) {
  if (["IDLE", "LANDED"].includes(drone.phase))
    return "Au sol · en attente d’une commande.";
  if (["RETURN_HOME", "RETURNING", "RETURN_TO_HOME"].includes(drone.phase))
    return "Retour vers la base demandé.";
  if (["LAND", "LANDING"].includes(drone.phase)) return "Descente vers le sol.";
  if (drone.phase === "HOVER")
    return "Maintien en station · en attente du départ en exploration.";
  if (drone.phase === "TAKEOFF") return "Montée vers l’altitude de vol.";
  const target = drone.waypoint;
  return target && [target.x, target.z].every(Number.isFinite)
    ? `${drone.action || "Navigation"} · cible X ${target.x.toFixed(1)}, Z ${target.z.toFixed(1)} m.`
    : "En attente d’un objectif communiqué par le moteur.";
}
