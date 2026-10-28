import { isAirborne } from "./simulation-adapter.js";
/** Current, observable conditions only; no synthetic operational events. */
export function getAttentionItems(
  snapshot,
  { disconnected = false, timedOut = false, commandFault = null } = {},
) {
  const items = [];
  if (!snapshot.ready) {
    if (disconnected || timedOut)
      items.push({
        id: "engine",
        severity: "critical",
        title: "Moteur indisponible",
        detail:
          "Les commandes sont désactivées. Vérifiez la connexion au simulateur.",
        agentId: null,
      });
    return items;
  }
  if (commandFault)
    items.push({
      id: "command",
      severity: "critical",
      title: "Commande non exécutée",
      detail: commandFault,
      agentId: null,
    });
  for (const d of snapshot.drones) {
    const add = (kind, severity, title, detail) =>
      items.push({
        id: `${d.id}:${kind}`,
        agentId: d.id,
        severity,
        title: `${d.name} · ${title}`,
        detail,
      });
    if (!d.position)
      add(
        "telemetry",
        "warning",
        "Position indisponible",
        "La position de cet agent ne peut pas être affichée sur la carte.",
      );
    if (d.battery !== null && d.battery <= 20)
      add(
        "battery",
        d.battery <= 10 ? "critical" : "warning",
        "Batterie faible",
        `${Math.round(d.battery)} % mesurés. Examinez la situation avant de poursuivre.`,
      );
    if (/EMERGENCY/.test(d.phase))
      add(
        "emergency",
        "critical",
        "État d’urgence",
        "Le moteur signale une phase d’urgence pour cet agent.",
      );
    if (!isAirborne(d)) continue;
    if (d.sensorCritical > 0)
      add(
        "obstacle",
        "critical",
        "Alerte capteur",
        `${d.sensorCritical} détection(s) critique(s) de proximité signalée(s) par le moteur.`,
      );
    else if (d.sensorWarnings > 0)
      add(
        "obstacle",
        "warning",
        "Obstacle à proximité",
        `${d.sensorWarnings} avertissement(s) de proximité signalé(s) par le moteur.`,
      );
    if (
      d.position &&
      (Math.abs(d.position.x) > snapshot.halfBounds.x ||
        Math.abs(d.position.z) > snapshot.halfBounds.z)
    )
      add(
        "bounds",
        "warning",
        "Hors zone",
        "L’agent dépasse les limites de la zone d’exploration.",
      );
  }
  return items.sort(
    (a, b) =>
      (a.severity === "critical" ? 0 : 1) -
        (b.severity === "critical" ? 0 : 1) || a.id.localeCompare(b.id),
  );
}
