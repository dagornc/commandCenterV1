import { initTabScroll } from "./tab-scroll.js";
import { initCommandShortcuts } from "./command-shortcuts.js";
import "./control-room-polish.css";
import { initHudOrganization } from "./hud-organization.js";
import "./hud-organization.css";
import { initDecisionWorkspace } from "./decision-workspace.js";
import { initMissionLibrary } from "./mission-library.js";
import { initFleetReview } from "./order-review.js";
import "./decision-workspace.css";
import { interfaceAudio, initInterfaceAudio } from "./interface-audio.js";
import { initStrategyShell } from "./strategy-shell.js";
import "./strategy-shell.css";
import { initMapLenses } from "./map-lenses.js";
import { PlanHistory } from "./plan-history.js";
import { initTacticalStatus } from "./tactical-status.js";
import { fleetCommandReason, initCommandAvailability } from "./command-availability.js";
import { initNavigationSearch } from "./navigation-search.js";
import { initTacticalToolbar } from "./tactical-toolbar.js";
import { initCameraBookmarks } from "./camera-bookmarks.js";
import { initWorkspace } from "./workspace-ui.js";
import { initSquads } from "./squads-ui.js";
import {readStored,validPlan,validReports,MissionRecorder} from "./session-memory.js";
import { initControlRoom } from "./control-room.js";
import {
  validatePlan,
  surveyPoints,
  createPlanProvider,
  describeIntent,
} from "./mission-plan.js";
import { hydrateIcons, icon } from "./icons.js";
import {
  getSnapshot,
  executeCommand,
  filterDrones,
  phaseLabels,
  isAirborne,
} from "./simulation-adapter.js";
import { getAttentionItems } from "./attention.js";
import { TacticalMap } from "./tactical-map.js";
const $ = (id) => document.getElementById(id);
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const display = (v, digits = 1) =>
  v === null || v === undefined ? "—" : v.toFixed(digits);
const frame = $("simulation-frame");
let workspace = null;
let decisionWorkspace = null;
let snapshot = getSnapshot(null),
  selected = null,
  missionStart = null,
  missionElapsed = 0,
  lastCommand = null,
  previousPhases = new Map(),
  wasReady = false,
  connectStarted = Date.now(),
  timedOut = false,
  view = "tactical",
  tableSignature = "",
  toastTimer;
const events = [];
const memoryStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
const recorder=new MissionRecorder();
let missionReports=validReports(readStored(memoryStorage,"diamants.command.reports",[]));
function remember(key,value){try{memoryStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function renderReports(){
 const list=$("mission-reports");if(!list)return;
 list.replaceChildren(...missionReports.map(report=>{
 const row=document.createElement("li");
 const date=new Date(report.endedAt).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"});
 const duration=Math.round(report.durationMs/1000);
 row.textContent=`${date} · ${Math.floor(duration/60)} min ${duration%60} s · ${report.agents} agents · ${report.peakFlying} actifs simultanément · couverture ${report.coverage===null?"non fournie":report.coverage.toFixed(1)+" %"}${report.interrupted?" · télémétrie interrompue pendant la mission":""}`;
 return row;
 }));
 $("mission-reports-empty").hidden=missionReports.length>0;
}

let disconnected = false,
  commandFault = null,
  attentionSignature = "",
  activeAttentionIds = new Set();
let previousAttentionSeverity = new Map();
const dockActions = $("dock-actions");
dockActions.append(
  ...document.querySelectorAll(".fleet-footer [data-command]"),
);

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
let preferences = {
  labels: true,
  motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
};
try {
  preferences = {
    ...preferences,
    ...JSON.parse(localStorage.getItem("diamants.command.preferences") || "{}"),
  };
} catch {
  /* Storage may be unavailable; session preferences still work. */
}
hydrateIcons();
const map = new TacticalMap($("tactical-map"), selectAgent);
map.showLabels = preferences.labels;
for(const key of Object.keys(map.layers)) if(typeof preferences.layers?.[key]==="boolean")map.layers[key]=preferences.layers[key];
document.querySelectorAll("[data-layer]").forEach(b=>{const active=map.layers[b.dataset.layer];b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
$("show-labels").checked = preferences.labels;
$("reduce-motion").checked = preferences.motion;
document.body.classList.toggle("reduce-motion", preferences.motion);
function savePreferences() {
  try {
    localStorage.setItem(
      "diamants.command.preferences",
      JSON.stringify(preferences),
    );
  } catch {
    /* private browsing */
  }
}
function notify(message, error = false) {
  interfaceAudio.play(error ? "error" : "info");
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", error);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4500);
}
function logEvent(message, type = "info") {
  interfaceAudio.play(type);
  const event = { at: new Date().toISOString(), type, message };
  events.unshift(event);
  if (events.length > 300) events.pop();
  const row = document.createElement("div");
  row.className = `event-row ${type}`;
  row.dataset.eventAt=Date.parse(event.at);row.tabIndex=0;row.setAttribute("role","button");row.title="Relire cet événement";row.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();row.click();}};
  row.innerHTML = `<time datetime="${event.at}">${timeFormat.format(new Date(event.at))}</time><span class="event-dot"></span><span class="event-kind">${type === "error" ? "ERREUR" : type === "warning" ? "COMMANDE" : type === "success" ? "SYSTÈME" : "ACTIVITÉ"}</span><p>${escapeHTML(message)}</p>`;
  $("activity-list").prepend(row);
  while ($("activity-list").children.length > 300)
    $("activity-list").lastElementChild.remove();
}
function selectAgent(id) {
  workspace?.show("agent");
  if (selected !== id && map.framing === "agent") map.framing = null;
  selected = id;
  tableSignature = "";
  renderFleet();
  renderInspector();
  map.update(snapshot, selected);
  decisionWorkspace?.update();
}
function setView(next) {
  view = next;
  $("map-stage").classList.toggle("scene", next === "scene");
  document.querySelectorAll("[data-view]").forEach((b) => {
    const active = b.dataset.view === next;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  document.querySelector(".framing-controls").hidden = next !== "tactical";
  frame.tabIndex = next === "scene" ? 0 : -1;
  frame.setAttribute("aria-hidden", String(next !== "scene"));
  if (next === "scene") frame.contentWindow?.diamantsSystem?.onWindowResize?.();
}
function renderFleet() {
  const filtered = filterDrones(
    snapshot.drones,
    $("fleet-search").value,
    $("fleet-filter").value,
  );
  const signature = JSON.stringify([filtered, selected, snapshot.ready]);
  if (signature === tableSignature) return;
  tableSignature = signature;
  const focused = document.activeElement?.dataset?.select;
  $("fleet-count").textContent = snapshot.drones.length;
  $("fleet-summary").textContent = snapshot.ready
    ? `${filtered.length} agent${filtered.length > 1 ? "s" : ""} affiché${filtered.length > 1 ? "s" : ""} sur ${snapshot.drones.length} · Télémétrie locale`
    : "En attente des données du simulateur";
  $("fleet-body").innerHTML = filtered.length
    ? filtered
        .map(
          (d) =>
            `<tr data-agent="${escapeHTML(d.id)}" class="${d.id === selected ? "selected" : ""}" aria-selected="${d.id === selected}"><td><i data-icon="drone">${icon("drone")}</i>${escapeHTML(d.name)}${d.id === selected ? "<small>SÉLECTIONNÉ</small>" : ""}</td><td>${escapeHTML(d.model)}</td><td><span class="phase-cell ${isAirborne(d) ? "flying" : ""}"><b></b>${escapeHTML(phaseLabels[d.phase] || d.phase)}</span></td><td>${display(d.position?.y)} m</td><td>${display(d.speed)} m/s</td><td><span class="battery-cell">${d.battery === null ? "—" : `<span class="battery-track"><b style="width:${d.battery}%"></b></span>${display(d.battery, 0)}%`}</span></td><td><button data-select="${escapeHTML(d.id)}" aria-label="Inspecter ${escapeHTML(d.name)}">↗</button></td></tr>`,
        )
        .join("")
    : `<tr><td colspan="7" class="empty-row">${snapshot.ready ? "Aucun agent ne correspond à votre recherche." : "Connexion à la flotte en cours…"}</td></tr>`;
  if (focused) {
    const button = [...$("fleet-body").querySelectorAll("[data-select]")].find(
      (b) => b.dataset.select === focused,
    );
    button?.focus({ preventScroll: true });
  }
}
function renderInspector() {
  const d = snapshot.drones.find((d) => d.id === selected);
  $("follow-button").disabled = !snapshot.ready || !d;
  $('agent-center').disabled = !snapshot.ready || !d?.position;
  const scope = !snapshot.ready ? 'Moteur indisponible : attendez la reconnexion.' : !d ? 'Sélectionnez un agent pour accéder à ses vues.' : !d.position ? `${d.name} · Position indisponible : centrage impossible.` : `${d.name} uniquement · Ces boutons changent la vue, sans donner d’ordre de vol.`;
  if ($('agent-action-scope').textContent !== scope) $('agent-action-scope').textContent = scope;
  if (!d) {
    $("agent-decision").textContent = "";
    $("agent-index").textContent = "— / —";
    $("agent-name").textContent = "Sélectionnez un agent";
    $("agent-phase").textContent = "—";
    $("agent-model").textContent = "EN ATTENTE";
    $("agent-role").textContent = "FLOTTE AUTONOME";
    for (const id of [
      "agent-altitude",
      "agent-speed",
      "agent-battery",
      "agent-position",
    ])
      $(id).textContent = "—";
    $("agent-objective").textContent =
      "En attente de la télémétrie du simulateur.";
    return;
  }
  $("agent-index").textContent =
    `${String(d.index + 1).padStart(2, "0")} / ${String(snapshot.drones.length).padStart(2, "0")}`;
  $("agent-name").textContent = d.name;
  $("agent-model").textContent = d.model;
  $("agent-role").textContent = d.role;
  $("agent-phase").textContent = phaseLabels[d.phase] || d.phase;
  $("agent-altitude").innerHTML = `${display(d.position?.y)} <small>m</small>`;
  $("agent-speed").innerHTML = `${display(d.speed)} <small>m/s</small>`;
  $("agent-battery").innerHTML =
    d.battery === null
      ? "— <small>non fournie</small>"
      : `${display(d.battery, 0)} <small>%</small>`;
  $("agent-position").textContent = d.position
    ? `${display(d.position.x)} / ${display(d.position.z)}`
    : "—";
  $("agent-objective").textContent = describeIntent(d);
  $("agent-decision").textContent =
    d.decision && ["EXPLORE", "EXPLORING", "EXPLORATION"].includes(d.phase)
      ? `Décision moteur : ${d.decision}`
      : "";
}
function renderMetrics() {
  $("metric-fleet").textContent = snapshot.ready
    ? String(snapshot.drones.length).padStart(2, "0")
    : "—";
  $("fleet-readiness").textContent = snapshot.ready
    ? "agents disponibles"
    : "Connexion…";
  $("metric-coverage").textContent =
    snapshot.ready && snapshot.coverage !== null
      ? `${display(snapshot.coverage, 1)}%`
      : "—";
  $("coverage-meter").style.width = `${snapshot.coverage || 0}%`;
  const airborne = snapshot.drones.filter(isAirborne).length;
  $("metric-airborne").textContent = snapshot.ready
    ? String(airborne).padStart(2, "0")
    : "—";
  $("airborne-label").textContent = snapshot.ready
    ? `sur ${snapshot.drones.length} agents`
    : "En attente du moteur";
  if (missionStart !== null) missionElapsed = Date.now() - missionStart;
  const secs = Math.floor(missionElapsed / 1000);
  $("metric-time").textContent =
    `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const returning = snapshot.drones.some((d) =>
    ["RETURN_HOME", "RETURNING", "RETURN_TO_HOME", "LAND", "LANDING"].includes(
      d.phase,
    ),
  );
  const status = !snapshot.ready
    ? "INITIALISATION"
    : lastCommand === "stop" &&
        snapshot.drones.every((d) => ["IDLE", "LANDED"].includes(d.phase))
      ? "ARRÊTÉ"
      : returning
        ? "RETOUR / POSÉ"
        : snapshot.started && snapshot.running
          ? "EN EXPLORATION"
          : airborne
            ? "EN VOL"
            : missionElapsed > 0
              ? "TERMINÉE"
              : "PRÊT AU DÉPART";
  $("mission-state").textContent = status;
  $("dock-status").textContent = status;
  $("focus-agent").disabled =
    !snapshot.ready ||
    !snapshot.drones.find((d) => d.id === selected)?.position;
  document
    .querySelectorAll("[data-launch-label]")
    .forEach(
      (el) =>
        (el.textContent =
          snapshot.started && snapshot.running
            ? "Mission en cours"
            : "Lancer la mission"),
    );
  $("map-status").textContent = !snapshot.ready
    ? "Préparation du terrain"
    : snapshot.started && snapshot.running
      ? "Exploration en cours"
      : airborne
        ? "Agents en vol"
        : "Flotte prête au départ";
  $("step-ready").className = snapshot.ready ? "done" : "";
  $("step-explore").className =
    snapshot.started && snapshot.running
      ? "current"
      : missionElapsed > 0
        ? "done"
        : "";
  $("step-return").className = returning
    ? "current"
    : missionElapsed > 0 && !airborne && !snapshot.started
      ? "done"
      : "";
  $("progress-count").textContent =
    `${snapshot.ready ? 1 + (missionElapsed > 0 && !snapshot.started ? 1 : 0) + (missionElapsed > 0 && !airborne && !snapshot.started ? 1 : 0) : 0} / 3`;
  document.querySelectorAll("[data-command]").forEach((b) => {
    const reason = fleetCommandReason(b.dataset.command, snapshot, returning, airborne);
    b.disabled = Boolean(reason);
    b.dataset.unavailableReason = reason;
  });
}
function poll() {
  $("clock").textContent = timeFormat.format(new Date());
  try {
    snapshot = getSnapshot(frame.contentWindow);
  } catch {
    snapshot = getSnapshot(null);
  }
  if (snapshot.ready && !wasReady) {
    const storedBounds = readStored(memoryStorage, "diamants.command.bounds", null);
    if (storedBounds && !snapshot.started && snapshot.drones.every(d => ["IDLE", "LANDED"].includes(d.phase))) changeBounds(storedBounds, {restore:true});
    wasReady = true;
    disconnected = false;
    timedOut = false;
    $("engine-message").hidden = true;
    $("engine-status").textContent = "Moteur connecté · données en direct";
    logEvent(
      `${snapshot.drones.length} agents connectés. Le terrain est prêt.`,
      "success",
    );
    selected = snapshot.drones[0]?.id;
  }
  if (!snapshot.ready && wasReady) {
    wasReady = false;
    disconnected = true;
    $("engine-status").textContent = "Connexion au moteur interrompue";
    logEvent(
      "Connexion au moteur interrompue. Les commandes sont désactivées.",
      "error",
    );
  }
  if (!snapshot.ready && Date.now() - connectStarted > 45000 && !timedOut) {
    timedOut = true;
    const el = $("engine-message");
    el.hidden = false;
    el.querySelector(".loader").hidden = true;
    el.querySelector("strong").textContent = "Le moteur ne répond pas encore";
    el.querySelector("span:last-of-type").textContent =
      "Vérifiez WebGL et relancez le chargement. Les commandes restent indisponibles.";
    $("retry-button").hidden = false;
    $("engine-status").textContent = "Initialisation à vérifier";
    logEvent(
      "Initialisation du moteur trop longue. Réessai disponible.",
      "warning",
    );
  }
  if (!snapshot.drones.some((d) => d.id === selected))
    selected = snapshot.drones[0]?.id || null;
  for (const d of snapshot.drones) {
    const previous = previousPhases.get(d.id);
    if (previous && previous !== d.phase)
      logEvent(`${d.name} · ${phaseLabels[d.phase] || d.phase}`);
    previousPhases.set(d.id, d.phase);
  }
  if (
    missionStart !== null &&
    snapshot.ready &&
    (!snapshot.running ||
      (!snapshot.started && !snapshot.drones.some(isAirborne)))
  ) {
    missionElapsed = Date.now() - missionStart;
    missionStart = null;
  }
  const report=recorder.update(snapshot);
  if(report){missionReports=[report,...missionReports].slice(0,5);remember("diamants.command.reports",missionReports);renderReports();logEvent("Bilan de mission disponible.","success");}
  squads.tick();
  renderPlan();
  renderAttention();
  renderMetrics();
  renderFleet();
  renderInspector();
  map.update(snapshot, selected);
  decisionWorkspace?.update();
}
function renderAttention() {
  const items = getAttentionItems(snapshot, {
    disconnected,
    timedOut,
    commandFault,
  });
  const signature = JSON.stringify(items);
  const ids = new Set(items.map((item) => item.id));
  for (const item of items)
    if (!activeAttentionIds.has(item.id) || (item.severity === "critical" && previousAttentionSeverity.get(item.id)!=="critical"))
      logEvent(item.title, item.severity === "critical" ? "error" : "warning");
  if (items.some((item) => !activeAttentionIds.has(item.id))) {
    $("attention-list").hidden = false;
    $("attention-toggle").setAttribute("aria-expanded", "true");
  }
  activeAttentionIds = ids;
  previousAttentionSeverity=new Map(items.map(i=>[i.id,i.severity]));
  $("attention-count").textContent = items.length;
  $("attention-summary").textContent =
    !snapshot.ready && !items.length
      ? "Connexion aux agents…"
      : items.length
        ? `${items.length} point${items.length > 1 ? "s" : ""} à examiner · sélectionnez pour localiser`
        : "Aucun point d’attention détecté";
  document
    .querySelector(".attention-center")
    .classList.toggle("has-alerts", items.length > 0);
  if (signature === attentionSignature) return;
  attentionSignature = signature;
  const focused = document.activeElement?.dataset?.attentionId;
  $("attention-list").innerHTML = items.length
    ? items
        .map(
          (item) =>
            `<button class="attention-item ${item.severity}" data-attention-id="${escapeHTML(item.id)}" ${item.agentId ? `data-attention-agent="${escapeHTML(item.agentId)}"` : ""}><span class="attention-severity">${item.severity === "critical" ? "PRIORITAIRE" : "À EXAMINER"}</span><span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.detail)}</small></span><span>${item.agentId ? "Localiser ↗" : "Voir l’état ↗"}</span></button>`,
        )
        .join("")
    : '<p class="attention-empty">Aucune alerte active. Les alertes capteurs, batteries renseignées et sorties de zone apparaîtront ici.</p>';
  if(items.length){
    const buttons=[...$("attention-list").children],groups=new Map();
    for(let i=0;i<items.length;i++){const key=items[i].agentId||'system';if(!groups.has(key)){const section=document.createElement('section'),heading=document.createElement('h3');heading.textContent=key==='system'?'Système':snapshot.drones.find(d=>d.id===key)?.name||key;section.append(heading);groups.set(key,section);}groups.get(key).append(buttons[i]);}
    $("attention-list").replaceChildren(...groups.values());
  }
  if (focused)
    [...$("attention-list").querySelectorAll("button")]
      .find((b) => b.dataset.attentionId === focused)
      ?.focus({ preventScroll: true });
}
$("attention-toggle").addEventListener("click", () => {
  const open = $("attention-list").hidden;
  $("attention-list").hidden = !open;
  $("attention-toggle").setAttribute("aria-expanded", String(open));
});
$("attention-list").addEventListener("click", (e) => {
  const item = e.target.closest("[data-attention-id]");
  if (!item) return;
  setView("tactical");
  if (item.dataset.attentionAgent) {
    selectAgent(item.dataset.attentionAgent);
    map.focusAgent();
  }
  $("map-stage").scrollIntoView({
    block: "center",
    behavior: preferences.motion ? "instant" : "smooth",
  });
});
$("fit-fleet").addEventListener("click", () => map.reset());
$("focus-agent").addEventListener("click", () => map.focusAgent());
$('agent-center').addEventListener('click', () => {
  setView('tactical'); map.focusAgent();
  $('map-stage').scrollIntoView({block:'center', behavior:'instant'});
  $('focus-agent').focus({preventScroll:true});
});
let planPoints = validPlan(readStored(memoryStorage,"diamants.command.plan",[])),
  planMode = null,
  firstCorner = null;
const planHistory = new PlanHistory();
let previousBounds = null;
let zoneDimensionsDirty = false;
let installedProvider = null,
  previousProvider = null;
function planLocked() {
  return (
    !snapshot.ready ||
    snapshot.started ||
    snapshot.drones.some((d) => !["IDLE", "LANDED"].includes(d.phase))
  );
}
function renderPlan() {
  const locked = planLocked();
  for (const id of ["plan-point", "plan-zone", "plan-undo", "plan-clear"])
    $(id).disabled = locked;
  for (const direction of ['undo','redo']) {
    const entry=planHistory.peek(direction), button=$('plan-'+direction);
    button.disabled=locked || !entry;
    button.textContent=entry?`${direction==='undo'?'Annuler':'Rétablir'} : ${entry.label}`:direction==='undo'?'Annuler':'Rétablir';
    button.setAttribute('aria-describedby','plan-history-status');
  }
  $('plan-clear').disabled=locked || !planPoints.length;
  $('plan-history-status').textContent=locked?'Historique verrouillé : attendez la connexion et le retour au sol de toute la flotte.':'Historique du plan pour cette session · Ctrl/Cmd+Z : annuler · Ctrl/Cmd+Maj+Z : rétablir. Les dimensions de zone ont leur propre annulation.';
  if (locked) {
    planMode = null;
    firstCorner = null;
  }
  $("resize-zone").disabled = locked;
  map.editingBounds = planMode === "bounds";
  map.canResizeBounds = !locked && document.body.dataset.workspace !== "supervise";
  for (const id of ["zone-width", "zone-depth", "zone-apply", "zone-preset"]) $(id).disabled = locked;
  $("zone-undo").disabled = locked || !previousBounds;
  for (const [id, axis] of [["zone-width", "x"], ["zone-depth", "z"]]) {
    if (!zoneDimensionsDirty && !$("zone-dimensions").contains(document.activeElement) && snapshot.halfBounds) $(id).value = snapshot.halfBounds[axis] * 2;
  }
  if (locked || planMode === "point" || planMode === "zone") {
    map.resizingBounds = false;
    map.previewBounds = null;
  }
  $("resize-zone").setAttribute("aria-pressed", String(map.editingBounds));
  map.editingPlan = planMode === "point" || planMode === "zone";
  map.planPoints = planPoints;
  $("plan-point").setAttribute("aria-pressed", String(planMode === "point"));
  $("plan-zone").setAttribute("aria-pressed", String(planMode === "zone"));
  $("plan-status").textContent =
    planMode === "bounds"
      ? "Faites glisser un bord ou un coin pour agrandir ou réduire la zone, puis relâchez pour appliquer. Zone centrée sur la base · Échap pour terminer."
      : planMode === "point"
      ? "Cliquez sur la carte pour ajouter une cible (24 maximum)."
      : planMode === "zone"
        ? firstCorner
          ? "Cliquez sur le coin opposé de la zone."
          : "Cliquez sur le premier coin de la zone."
        : planPoints.length
          ? `${planPoints.length} objectifs · ${snapshot.started ? "mission lancée" : "appliqués au prochain lancement"}.`
          : "Exploration autonome · aucun plan défini.";
}
function updateTargets() {
  const saved=remember("diamants.command.plan",planPoints);
  $("plan-storage-status").textContent=saved?"Plan enregistré sur cet appareil. Le rechargement ne relance pas la mission.":"Enregistrement local indisponible : plan conservé pour cette session seulement.";
  $("plan-targets").replaceChildren(
    ...planPoints.map((p, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1} · X ${p.x.toFixed(1)} / Z ${p.z.toFixed(1)} m`;
      return li;
    }),
  );
  renderPlan();
  map.draw();
}
function applyMissionPlan() {
  squads.cancel();
  const engine =
    frame.contentWindow.diamantsSystem.integratedController
      .autonomousFlightEngine;
  if (!planPoints.length) {
    if (engine.missionWaypointProvider === installedProvider)
      engine.missionWaypointProvider = previousProvider;
    installedProvider = null;
    return;
  }
  validatePlan({ points: planPoints }, snapshot.halfBounds);
  if (engine.missionWaypointProvider !== installedProvider)
    previousProvider = engine.missionWaypointProvider;
  installedProvider = createPlanProvider(
    planPoints,
    snapshot.drones.map((d) => d.id),
  );
  engine.missionWaypointProvider = installedProvider;
}
const squads = initSquads({frame,map,getSnapshot:()=>snapshot,getPlan:()=>planPoints,notify,onFocus:()=>workspace?.show("squad"),onMapFocus:()=>{setView("tactical");$("map-stage").scrollIntoView({block:"center"});}});
$("resize-zone").addEventListener("click", () => {
  if (planLocked()) return;
  planMode = planMode === "bounds" ? null : "bounds";
  firstCorner = null;
  setView("tactical");
  map.fitBounds();
  renderPlan();
  map.draw();
  $("map-stage").scrollIntoView({ block: "center" });
});
function changeBounds(bounds, {restore = false, undo = false} = {}) {
  if (planLocked()) return;
  try {
    if (!bounds || ![bounds.x, bounds.z].every(v => Number.isFinite(v) && v >= 5 && v <= 5000)) throw new Error("Les dimensions doivent être comprises entre 10 et 10 000 m.");
    if (planPoints.length) validatePlan({ points: planPoints }, bounds);
    const oldBounds = { ...snapshot.halfBounds };
    const doc = frame.contentDocument;
    const x = doc.getElementById("bounds_x"), z = doc.getElementById("bounds_y");
    if (!x || !z) throw new Error("Réglage de la zone indisponible.");
    x.value = String(bounds.x * 2);
    z.value = String(bounds.z * 2);
    x.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
    snapshot = getSnapshot(frame.contentWindow);
    map.update(snapshot, selected);
    if (!restore) map.fitBounds();
    if (!restore) previousBounds = undo ? null : oldBounds;
    const saved = remember("diamants.command.bounds", bounds);
    $("zone-storage-status").textContent = saved ? "Dimensions enregistrées sur cet appareil. Survolez un bord pour redimensionner." : "Enregistrement indisponible : dimensions conservées pour cette session.";
    zoneDimensionsDirty = false;
    $("zone-width").value = bounds.x * 2;
    $("zone-depth").value = bounds.z * 2;
    renderPlan();
    if (!restore) notify(`Zone d’exploration : ${bounds.x * 2} × ${bounds.z * 2} m.`);
  } catch (error) { notify(error.message, true); }
}
map.onBoundsChange = bounds => changeBounds(bounds);
for (const id of ["zone-width", "zone-depth"]) $(id).addEventListener("input", () => {
  zoneDimensionsDirty = true;
  $("zone-storage-status").textContent = "Dimensions modifiées · cliquez sur Appliquer pour les transmettre au simulateur.";
});
$("zone-dimensions").addEventListener("submit", event => {
  event.preventDefault();
  changeBounds({x: Number($("zone-width").value)/2, z:Number($("zone-depth").value)/2});
});
$("zone-undo").addEventListener("click", () => { if (previousBounds) changeBounds(previousBounds, {undo:true}); });
$("zone-preset").addEventListener("change", event => {
  if (event.target.value) changeBounds({x:Number(event.target.value)/2,z:Number(event.target.value)/2});
  event.target.value = "";
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && (planMode === "bounds" || map.resizingBounds)) {
    map.resizingBounds = false;
    map.previewBounds = null;
    planMode = null;
    renderPlan();
    map.draw();
  }
});
map.onPlanPoint = (p) => {
  if (planLocked()) return;
  try {
    validatePlan({ points: [p] }, snapshot.halfBounds);
    if (planMode === "zone" && !firstCorner) {
      firstCorner = p;
      renderPlan();
      return;
    }
    const next =
      planMode === "zone" ? surveyPoints(firstCorner, p) : [...planPoints, p];
    validatePlan({ points: next }, snapshot.halfBounds);
    planHistory.record(planPoints,next,planMode==='zone'?'zone de balayage':'ajout d’un objectif');
    planPoints = next;
    if (planMode === "zone") {
      firstCorner = null;
      planMode = null;
    }
    updateTargets();
  } catch (error) {
    notify(error.message, true);
  }
};
for (const mode of ["point", "zone"])
  $("plan-" + mode).addEventListener("click", () => {
    if (planLocked()) return;
    planMode = mode;
    firstCorner = null;
    setView("tactical");
    map.framing = null;
    map.center = { x: 0, z: 0 };
    map.zoom = 1;
    renderPlan();
    map.draw();
    $("map-stage").scrollIntoView({ block: "center" });
  });
$("plan-finish").addEventListener("click", () => {
  planMode = null;
  firstCorner = null;
  renderPlan();
});
function restorePlan(direction) {
  if (planLocked()) return;
  const entry=planHistory.peek(direction);
  if(!entry)return;
  try {
    if(entry.points.length)validatePlan({points:entry.points},snapshot.halfBounds);
    planPoints=planHistory.move(direction);
    firstCorner=null;planMode=null;
    updateTargets();
    notify(`${direction==='undo'?'Annulé':'Rétabli'} : ${entry.label}.`);
  } catch(error) { notify(`Restauration impossible : ${error.message}`,true); }
}
$('plan-undo').addEventListener('click',()=>restorePlan('undo'));
$('plan-redo').addEventListener('click',()=>restorePlan('redo'));
$("plan-clear").addEventListener("click", () => {
  if (!planLocked() && planPoints.length) {
    planHistory.record(planPoints,[],`effacement de ${planPoints.length} objectifs`);
    planPoints = [];
    firstCorner = null;
    planMode = null;
    updateTargets();
  }
});
document.addEventListener('keydown',event=>{
  if(event.defaultPrevented || event.repeat || event.altKey || !(event.ctrlKey||event.metaKey) || event.key.toLowerCase()!=='z' ||
     event.target.closest?.('input,textarea,select,[contenteditable]') || document.querySelector('dialog[open]') ||
     $('map-stage').classList.contains('workbench') || $('context-zone').getAttribute('aria-pressed')!=='true')return;
  event.preventDefault();restorePlan(event.shiftKey?'redo':'undo');
});
$("toggle-inspector").addEventListener("click", () => {
  const hidden = !$("agent-inspector").hidden;
  preferences.inspectorHidden=hidden;savePreferences();
  $("agent-inspector").hidden = hidden;
  document
    .querySelector(".operations-grid")
    .classList.toggle("inspector-collapsed", hidden);
  $("toggle-inspector").setAttribute("aria-expanded", String(!hidden));
  $("toggle-inspector").textContent = hidden
    ? "Afficher l’inspecteur"
    : "Masquer l’inspecteur";
});
if(preferences.inspectorHidden===true) $("toggle-inspector").click();
updateTargets();renderReports();
logEvent("Espace de commandement ouvert. Initialisation du simulateur.");
const timer = setInterval(poll, 500);
poll();
$("fleet-body").addEventListener("click", (e) => {
  const row = e.target.closest("[data-agent]");
  if (row) selectAgent(row.dataset.agent);
});
$("fleet-search").addEventListener("input", renderFleet);
$("fleet-filter").addEventListener("change", renderFleet);
document.querySelectorAll("[data-command]").forEach((button) =>
  button.addEventListener("click", () => {
    const command = button.dataset.command;
    try {
      squads.cancel();
      if (command === "launch") applyMissionPlan();
      executeCommand(frame.contentWindow, command);
      commandFault = null;
      lastCommand = command;
      if (command === "launch") missionStart = Date.now();
      const messages = {
        launch: "Mission d’exploration lancée.",
        takeoff: "Décollage de la flotte demandé.",
        land: "Atterrissage de la flotte demandé.",
        return: "Retour à la base demandé.",
        stop: "Arrêt d’urgence transmis au simulateur.",
      };
      logEvent(messages[command], command === "stop" ? "warning" : "success");
      notify(messages[command]);
      poll();
    } catch (error) {
      commandFault = error.message;
      renderAttention();
      logEvent(error.message, "error");
      notify(error.message, true);
    }
  }),
);
document
  .querySelectorAll("[data-view]")
  .forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
document.querySelectorAll("[data-layer]").forEach((b) =>
  b.addEventListener("click", () => {
    const key = b.dataset.layer;
    map.layers[key] = !map.layers[key];
    preferences.layers={...map.layers};savePreferences();
    b.classList.toggle("active", map.layers[key]);
    b.setAttribute("aria-pressed", String(map.layers[key]));
    map.draw();
    if (key === "links" && map.layers.links)
      notify("Proximité : segments entre agents distants de moins de 30 m.");
  }),
);
$("zoom-in").addEventListener("click", () => {
  if (view === "tactical") map.changeZoom(1.3);
  else zoomScene(0.8);
});
$("zoom-out").addEventListener("click", () => {
  if (view === "tactical") map.changeZoom(1 / 1.3);
  else zoomScene(1.25);
});
function zoomScene(factor) {
  const sys = frame.contentWindow?.diamantsSystem;
  if (sys?.camera && sys?.controls) {
    sys.autoFollow = false;
    sys.followDroneIndex = -1;
    sys.camera.position
      .sub(sys.controls.target)
      .multiplyScalar(factor)
      .add(sys.controls.target);
    sys.controls.update();
  }
}
$("recenter").addEventListener("click", () => {
  if (view === "tactical") map.reset();
  else {
    const sys = frame.contentWindow?.diamantsSystem;
    if (sys) {
      sys.autoFollow = false;
      sys.followDroneIndex = -1;
    }
    frame.contentWindow?.DIAMANTS?.zoomToSwarm?.();
  }
});
$("tactical-map").addEventListener("pointermove", (e) => {
  const r = e.currentTarget.getBoundingClientRect(),
    p = map.unproject(e.clientX - r.left, e.clientY - r.top);
  $("map-coordinates").textContent = `${p.x.toFixed(1)} / ${p.z.toFixed(1)}`;
});
$("follow-button").addEventListener("click", () => {
  const sys = frame.contentWindow?.diamantsSystem;
  const d = snapshot.drones.find((d) => d.id === selected);
  if (!sys || !d) return;
  const index = sys.drones.findIndex((drone) => drone.id === d.id);
  if (index < 0) {
    notify("Cet agent ne peut pas encore être suivi.", true);
    return;
  }
  sys.autoFollow = true;
  sys.followDroneIndex = index;
  setView("scene");
  notify(`Caméra attachée à ${d.name}.`);
});
$("settings-button").addEventListener("click", () =>
  $("settings-dialog").showModal(),
);
$("help-button").addEventListener("click", () => $("help-dialog").showModal());
$("show-labels").addEventListener("change", (e) => {
  preferences.labels = e.target.checked;
  map.showLabels = preferences.labels;
  savePreferences();
  map.draw();
});
$("reduce-motion").addEventListener("change", (e) => {
  preferences.motion = e.target.checked;
  document.body.classList.toggle("reduce-motion", preferences.motion);
  savePreferences();
});
$("activity-toggle").addEventListener("click", () => {
  const expanded = $("activity-panel").classList.toggle("expanded");
  $("activity-toggle").setAttribute("aria-expanded", String(expanded));
  $("activity-toggle").innerHTML =
    `${expanded ? "Réduire" : "Développer"} <i data-icon="chevron">${icon("chevron")}</i>`;
});
$("export-button").addEventListener("click", () => {
  const data = {
    application: "DIAMANTS Command Center",
    mode: "local-simulation",
    exportedAt: new Date().toISOString(),
    missionElapsedMs: missionElapsed,
    recentMissionReports: missionReports,
    plan: { points: planPoints },
    agents: snapshot.drones,
    coverage: snapshot.coverage,
    events: [...events].reverse(),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `diamants-mission-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("Journal et télémétrie exportés.");
});
$("retry-button").addEventListener("click", () => {
  recorder.reset();
  wasReady = false;
  timedOut = false;
  connectStarted = Date.now();
  previousPhases.clear();
  selected = null;
  snapshot = getSnapshot(null);
  map.trails.clear();
  missionStart = null;
  missionElapsed = 0;
  lastCommand = null;
  $("retry-button").hidden = true;
  $("engine-message").querySelector(".loader").hidden = false;
  $("engine-message").querySelector("strong").textContent =
    "Reconnexion au simulateur";
  $("engine-message").querySelector("span:last-of-type").textContent =
    "Chargement du terrain et des agents…";
  frame.src = "./simulation.html?embedded=1";
  renderMetrics();
  renderFleet();
  renderInspector();
});
document.querySelectorAll("[data-nav]").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll("[data-nav]").forEach((n) => {
      n.classList.toggle("active", n === b);
      if (n === b) n.setAttribute("aria-current", "page");
      else n.removeAttribute("aria-current");
    });
    const dest = {
      operations: "workspace",
      fleet: "fleet-panel",
      activity: "activity-panel",
    }[b.dataset.nav];
    if (
      b.dataset.nav === "activity" &&
      !$("activity-panel").classList.contains("expanded")
    )
      $("activity-toggle").click();
    $(dest).scrollIntoView({
      behavior: preferences.motion ? "instant" : "smooth",
      block: "start",
    });
  }),
);
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    $("fleet-search").focus();
  }
});
window.addEventListener("pagehide", () => {
  clearInterval(timer);
  clearTimeout(toastTimer);
  map.dispose();
});
setView("tactical");

const workbenchRoots = {
  all: "ros_interface",
  fleet: "fleet-models-panel",
  agent: "drone-select-panel",
  chat: "llm-chat-panel",
  maps: "minimap-picker-overlay",
  communications: "minimap-fullscreen-viewer",
  coordination: "swarm-rl-panel",
  fractal: "fractal-hypervision-panel",
  optimal: "optimal-search-ui",
  quality: "quality-control-panel",
};
const workbenchDescriptions = {
  all: "Commandes et réglages de la mission en cours.",
  fleet: "Créer un drone lance la mission et le décollage de toute la flotte.",
  agent: "Télémétrie et communications de l’agent sélectionné.",
  chat: "Instructions et réponses du service LLM configuré.",
  maps: "Choisissez une des six cartes spécialisées.",
  communications: "Réseau et messages P2P observés.",
  coordination: "État de coordination et échanges collectifs.",
  fractal: "Explorer les couches L0–L5 et leurs données.",
  optimal: "Comparaison de stratégies : scores issus de baselines simulées.",
  quality: "Qualité de rendu et performances du navigateur.",
};
let savedWorkbenchView = "tactical";
function openWorkbench(tool = "all") {
  const win = frame.contentWindow,
    sys = win?.diamantsSystem;
  if (!snapshot.ready || !sys) {
    notify("Le simulateur est encore en préparation.", true);
    return;
  }
  const available = {
    all: true,
    fleet: !!win.__fleetModelsPanel?.ouvrir,
    chat: !!sys.llmChatPanel?.show,
    maps: !!win.minimapManager?.openPicker,
    fractal: !!sys.fractalPanel?.toggle,
    quality: !!sys.environment?.qualityPanel?.toggle,
    coordination: !!sys.swarmCoordinationPanel?.show,
    communications: !!win.minimapManager?.openViewer,
    optimal: !!sys.optimalSearchUI?.show,
    agent: !!sys.droneSelectPanel?.select,
  };
  if (!available[tool]) {
    notify(
      "Cet outil n’est pas disponible dans cette instance du simulateur.",
      true,
    );
    return;
  }
  if (!$("map-stage").classList.contains("workbench"))
    savedWorkbenchView = view;
  setView("scene");
  const doc = frame.contentDocument;
  doc.documentElement.classList.remove("workbench-scene-only");
  doc.documentElement.dataset.workbenchTool = tool;
  doc
    .querySelectorAll(".workbench-pane")
    .forEach((el) => el.classList.remove("workbench-pane"));
  doc.getElementById(workbenchRoots[tool])?.classList.add("workbench-pane");
  win.minimapManager?.closePicker();
  win.minimapManager?.closeViewer();
  $("workbench-tool").value = tool;
  $("workbench-title").textContent =
    $("workbench-tool").selectedOptions[0].textContent;
  $("workbench-description").textContent = workbenchDescriptions[tool];
  $("workbench-show").textContent = "Masquer le panneau";
  $("workbench-show").setAttribute("aria-pressed", "true");
  frame.contentDocument.documentElement.classList.remove("command-embedded");
  frame.contentDocument.documentElement.classList.add("command-workbench");
  const wide=preferences.workbenchWide===true;
  frame.contentDocument.documentElement.classList.toggle("workbench-wide",wide);
  $("workbench-expand").setAttribute("aria-pressed",String(wide));
  $("workbench-expand").textContent=wide?"Réduire":"Agrandir";
  $("map-stage").classList.add("workbench");
  $("workbench-bar").hidden = false;
  document.body.classList.add("workbench-open");
  const actions = {
    optimal: () => sys.optimalSearchUI.show(),
    agent: () =>
      sys.droneSelectPanel.select(
        Math.max(
          0,
          sys.drones.findIndex((d) => d.id === selected),
        ),
      ),
    all: () => {
      const p = frame.contentDocument.getElementById("ros_interface");
      p.style.display = "block";
    },
    fleet: () => win.__fleetModelsPanel?.ouvrir(),
    chat: () => sys.llmChatPanel?.show(),
    maps: () => win.minimapManager?.openPicker(),
    fractal: () => {
      if (!sys.fractalPanel?.visible) sys.fractalPanel?.toggle();
    },
    quality: () => sys.environment?.qualityPanel?.toggle(true),
    coordination: () => sys.swarmCoordinationPanel?.show(),
    communications: () => win.minimapManager?.openViewer("comm-panel-map"),
  };
  actions[tool]?.();
  requestAnimationFrame(() => sys.onWindowResize?.());
  $("close-workbench").focus();
}
function closeWorkbench() {
  frame.contentDocument.documentElement.classList.add("command-embedded");
  frame.contentDocument.documentElement.classList.remove("command-workbench");
  $("map-stage").classList.remove("workbench");
  $("workbench-bar").hidden = true;
  document.body.classList.remove("workbench-open");
  frame.contentWindow.minimapManager?.closeViewer();
  setView(savedWorkbenchView);
  frame.contentWindow.diamantsSystem?.onWindowResize?.();
  $("open-control-room").focus();
}
$("close-workbench").addEventListener("click", closeWorkbench);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("map-stage").classList.contains("workbench"))
    closeWorkbench();
});
initControlRoom({
  frame,
  notify,
  openWorkbench,
  onSourceChange: (source) => {
    if (
      ["mission_type", "mode_select"].includes(source.id) &&
      planPoints.length
    ) {
      planPoints = [];
      planHistory.clear();
      updateTargets();
      applyMissionPlan();
      notify(
        "Plan manuel retiré : la doctrine sélectionnée guide maintenant la mission.",
      );
    }
  },
  onSourceAction: (source) => {
    const action =
      source.dataset.action || source.getAttribute("onclick") || "";
    const commands = {
      launchMission: "launch",
      emergencyLand: "stop",
      takeoffAllDrones: "takeoff",
      landAllDrones: "land",
      returnToHome: "return",
    };
    const name = action.split("(")[0];
    if (commands[name]) {
      document.querySelector(`[data-command="${commands[name]}"]`).click();
      return false;
    }
    if (name === "resetMission") {
      recorder.reset();
      frame.contentWindow.resetMission();
      missionStart = null;
      missionElapsed = 0;
      lastCommand = null;
      map.trails.clear();
      previousPhases.clear();
      logEvent("Mission réinitialisée.", "warning");
      poll();
      return false;
    }
    if (source.id === "btn-place-beacon-click") {
      $("control-room").close();
      openWorkbench("all");
    }
    if (name === "togglePanel") {
      $("control-room").close();
      openWorkbench("all");
      return false;
    }
    if (name === "toggleMinimap") {
      $("control-room").close();
      openWorkbench("maps");
      return false;
    }
    if (
      [
        "resetCamera",
        "topView",
        "zoomToSwarm",
        "toggleFollowMode",
        "toggleDroneLabels",
        "toggleCommWaves",
      ].includes(name)
    ) {
      setView("scene");
    }
    logEvent(`Commande transmise : ${source.textContent.trim()}`);
  },
});

document.querySelectorAll("[data-expert]").forEach((button) =>
  button.addEventListener("click", async () => {
    const win = frame.contentWindow,
      sys = win?.diamantsSystem;
    if (!snapshot.ready) {
      notify("Le moteur n’est pas prêt.", true);
      return;
    }
    const key = button.dataset.expert;
    try {
      if (key === "fullscreen") {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } else if (key === "rotate") {
        sys.controls.autoRotate = !sys.controls.autoRotate;
        button.setAttribute("aria-pressed", String(sys.controls.autoRotate));
      } else if (key === "lock") {
        sys.isLocked ? sys.unlockCamera() : sys.lockCamera();
        button.setAttribute("aria-pressed", String(sys.isLocked));
      } else if (key === "post") {
        if (!sys.composer)
          throw new Error("Post-traitement indisponible pour ce rendu.");
        sys.usePostProcessing = !sys.usePostProcessing;
        button.setAttribute("aria-pressed", String(sys.usePostProcessing));
      } else {
        if (typeof win[key] !== "function")
          throw new Error("Commande absente du simulateur.");
        win[key]();
      }
      $("expert-status").textContent =
        `Commande transmise : ${button.textContent}.`;
    } catch (error) {
      $("expert-status").textContent = error.message;
    }
  }),
);
$("expert-formation").addEventListener("change", (e) => {
  if (typeof frame.contentWindow.setFormation !== "function") {
    notify("Gestionnaire de formation indisponible.", true);
    return;
  }
  frame.contentWindow.setFormation(e.target.value);
  $("expert-status").textContent =
    `Formation sélectionnée : ${e.target.selectedOptions[0].textContent}.`;
});

$("workbench-tool").addEventListener("change", (e) =>
  openWorkbench(e.target.value),
);
$("workbench-show").addEventListener("click", () => {
  const hidden = frame.contentDocument.documentElement.classList.toggle(
    "workbench-scene-only",
  );
  $("workbench-show").setAttribute("aria-pressed", String(!hidden));
  $("workbench-show").textContent = hidden
    ? "Afficher le panneau"
    : "Masquer le panneau";
  if (!hidden) openWorkbench($("workbench-tool").value);
});
$("workbench-expand").addEventListener("click", () => {
  const expanded =
    frame.contentDocument.documentElement.classList.toggle("workbench-wide");
  preferences.workbenchWide=expanded;savePreferences();
  $("workbench-expand").setAttribute("aria-pressed", String(expanded));
  $("workbench-expand").textContent = expanded ? "Réduire" : "Agrandir";
});

function installWorkbenchKeyboard() {
  const doc = frame.contentDocument;
  if (!doc || doc.documentElement.dataset.workbenchKeyboard) return;
  doc.documentElement.dataset.workbenchKeyboard = "true";
  doc.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !event.defaultPrevented &&
      !event.target.closest?.("input,textarea,select,[contenteditable=true]") &&
      $("map-stage").classList.contains("workbench")
    ) {
      closeWorkbench();
      event.preventDefault();
    }
  });
}
frame.addEventListener("load", installWorkbenchKeyboard);
installWorkbenchKeyboard();

workspace = initWorkspace({map,onCancelEditing:()=>{planMode=null;firstCorner=null;renderPlan();},onPrepareMap:()=>{planMode=null;firstCorner=null;renderPlan();setView("tactical");}});

initCameraBookmarks({map,container:document.querySelector('.map-panel'),storage:memoryStorage,notify,onRecall:()=>{
  setView('tactical');preferences.layers={...map.layers};savePreferences();
  document.querySelectorAll('[data-layer]').forEach(button=>{const active=map.layers[button.dataset.layer];button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
}});

initTacticalToolbar();
initNavigationSearch();
initCommandAvailability();
initTacticalStatus();

initMapLenses({map,onChange:()=>{preferences.layers={...map.layers};savePreferences();},onTactical:()=>setView("tactical")});

const hudShell=initStrategyShell({map});

initInterfaceAudio();

initFleetReview({getSnapshot:()=>snapshot,getPlan:()=>planPoints});
initMissionLibrary({container:document.getElementById('hud-left'),storage:memoryStorage,getPlan:()=>planPoints.map(p=>({...p})),getOrders:()=>squads.getOrders(),applyOrders:items=>squads.applyOrders(items),getBounds:()=>snapshot.halfBounds,notify,applyPlan:points=>{
 if(planLocked())throw new Error('Le plan ne peut être chargé que lorsque la flotte est au sol et le moteur disponible.');
 validatePlan({points},snapshot.halfBounds);planHistory.record(planPoints,points,'Charger un modèle');planPoints=points;planMode=null;firstCorner=null;updateTargets();workspace.show('zone');setView('tactical');
}});
decisionWorkspace=initDecisionWorkspace({map,getSnapshot:()=>snapshot,getSelected:()=>selected,getAttention:()=>getAttentionItems(snapshot,{disconnected,timedOut,commandFault}),getEvents:()=>events,selectAgent,prepareAgent:(id,type)=>squads.prepareAgent(id,type),onTactical:()=>setView('tactical')});
decisionWorkspace.update();

initHudOrganization({shell:hudShell});

initCommandShortcuts();

initTabScroll();
