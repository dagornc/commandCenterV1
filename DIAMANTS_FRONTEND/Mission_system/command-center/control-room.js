import {
  controlLabels,
  consequences,
  translateLabel,
  normalizeSearch,
  sourceKey,
} from "./control-labels.js";
/** Mirror the live legacy controls without duplicating their engine handlers. */
const categories = [
  ["performance", "Performance", 7, "Fréquence de rendu et mode du simulateur"],
  [
    "mission",
    "Mission & autonomie",
    1,
    "Doctrines, parcours, balises et scénarios",
  ],
  [
    "collective",
    "Intelligence collective",
    2,
    "Stigmergie, émergence, cohésion et coordination",
  ],
  [
    "intelligence",
    "Intelligence LLM",
    3,
    "Connexion Ollama, modèles et influence",
  ],
  [
    "decisions",
    "Décisions des agents",
    4,
    "Flux de décisions et état des cerveaux",
  ],
  ["camera", "Vue & caméra", 5, "Caméra, suivi, cartes et communications"],
  [
    "configuration",
    "Paramètres de vol",
    6,
    "Altitude, séparation et dimensions du terrain",
  ],
  ["system", "État du système", 0, "Mode, flotte et métriques de connexion"],
];
export function initControlRoom({
  frame,
  onSourceAction,
  onSourceChange,
  openWorkbench,
  notify,
}) {
  const dialog = document.getElementById("control-room");
  const nav = document.getElementById("control-categories");
  const content = document.getElementById("control-content");
  const search = document.getElementById("control-search");
  const results = document.createElement("div");
  results.id = "command-results";
  results.setAttribute("aria-label", "Réglages trouvés");
  search.parentElement.after(results);
  const footer=dialog.querySelector('footer');
  const workshops=document.createElement('details');workshops.className='control-workshops';workshops.id='control-workshops';
  const summary=document.createElement('summary');summary.textContent='Ateliers spécialisés · scène 3D';workshops.append(summary,footer);
  footer.querySelector('strong').remove();dialog.querySelector('.control-scroll').append(workshops);
  nav.addEventListener('keydown',event=>{
    const tabs=[...nav.querySelectorAll('button')],index=tabs.indexOf(event.target);if(index<0)return;
    let next;if(['ArrowDown','ArrowRight'].includes(event.key))next=(index+1)%tabs.length;else if(['ArrowUp','ArrowLeft'].includes(event.key))next=(index-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
    event.preventDefault();tabs[next].click();tabs[next].focus();tabs[next].scrollIntoView({block:'nearest',inline:'nearest'});
  });
  let selected = "mission",
    sourceDocument = null,
    pairs = [],
    sections = [];
  const cleanLabel = (text) => text.replace(/[▶▼]/g, "").trim();
  function build() {
    const doc = frame.contentDocument;
    const sourcePanels = [
      ...doc.querySelectorAll("#ros_interface > .ros_panel"),
    ];
    if (!sourcePanels.length) return;
    sourceDocument = doc;
    pairs = [];
    sections = [];
    content.replaceChildren();
    nav.replaceChildren();
    for (const [key, label, index, description] of categories) {
      const source = sourcePanels[index];
      if (!source) continue;
      const tab = document.createElement("button");
      tab.textContent = label;tab.type='button';tab.setAttribute('aria-controls',`control-section-${key}`);
      const descriptionText=document.createElement('small');descriptionText.textContent=description;tab.append(descriptionText);
      tab.dataset.category = key;
      tab.addEventListener("click", () => {
        selected = key;
        search.value = "";
        filter();
      });
      nav.append(tab);
      const section = document.createElement("section");
      section.dataset.controlCategory = key;section.id=`control-section-${key}`;
      const heading = document.createElement("h3");
      heading.textContent = label;
      const intro = document.createElement("p");
      intro.textContent = description;
      section.append(heading, intro);
      const clone = source.cloneNode(true);
      clone.className = "control-surface";
      const originals = [source, ...source.querySelectorAll("*")];
      const copies = [clone, ...clone.querySelectorAll("*")];
      originals.forEach((original, i) => {
        const copy = copies[i];
        for (const attr of [...copy.attributes])
          if (
            attr.name.startsWith("on") ||
            ["style", "id", "class"].includes(attr.name)
          )
            copy.removeAttribute(attr.name);
        if (original.id) copy.dataset.sourceId = original.id;
        if (original.getAttribute("onclick"))
          copy.dataset.sourceAction = original.getAttribute("onclick");
        if (original.tagName === "H3") {
          copy.hidden = true;
          return;
        }
        if (
          ["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(original.tagName)
        ) {
          copy.classList.add("source-control");
          const label =
            original.getAttribute("aria-label") ||
            original.title ||
            original.previousElementSibling?.textContent ||
            original.id ||
            original.textContent;
          const name =
            controlLabels[sourceKey(original)] ||
            cleanLabel(label).slice(0, 180);
          copy.setAttribute("aria-label", name);
          if (consequences[sourceKey(original)]) {
            const hint = document.createElement("small");
            hint.className = "command-consequence";
            hint.id = `command-hint-${pairs.length}`;
            hint.textContent = consequences[sourceKey(original)];
            copy.after(hint);
            copy.setAttribute("aria-describedby", hint.id);
          }
          if (original.tagName === "BUTTON") {
            copy.type = "button";
            const action=original.dataset.action||(original.getAttribute('onclick')||'').split('(')[0];
            if(action==='launchMission')copy.classList.add('control-primary');
            if(['emergencyLand','resetDronesOnly'].includes(action))copy.classList.add('control-danger');
            copy.addEventListener("click", () => {
              if (original.disabled) return;
              try {
                if (onSourceAction(original) !== false) original.click();
                sync();
              } catch (e) {
                notify(e.message, true);
              }
            });
          } else {
            for (const eventName of ["input", "change"])
              copy.addEventListener(eventName, () => {
                if (original.disabled) return;
                if (!copy.checkValidity()) {
                  copy.reportValidity();
                  return;
                }
                onSourceChange(original);
                original.value = copy.value;
                if ("checked" in copy) original.checked = copy.checked;
                original.dispatchEvent(
                  new frame.contentWindow.Event(eventName, { bubbles: true }),
                );
                sync();
              });
          }
        } else if (
          original.id === "emergence_toggle" ||
          original.dataset.step
        ) {
          copy.tabIndex = 0;
          copy.setAttribute("role", "button");
          const activate = () => {
            original.click();
            sync();
          };
          copy.addEventListener("click", activate);
          copy.addEventListener("keydown", (e) => {
            if (["Enter", " "].includes(e.key)) {
              e.preventDefault();
              activate();
            }
          });
        }
        pairs.push({ original, copy });
      });
      clone.className = "control-surface";
      section.append(clone);
      content.append(section);
      sections.push({ section, label, source });
    }
    for (const { copy } of pairs)
      for (const node of copy.childNodes)
        if (node.nodeType === 3)
          node.textContent = translateLabel(node.textContent);
    filter();
    sync();
  }
  function filter() {
    const q = normalizeSearch(search.value.trim());
    let count = 0;
    results.replaceChildren();
    results.hidden = !q;
    for (const { section } of sections) {
      section.hidden = !!q || section.dataset.controlCategory !== selected;
      if (!section.hidden) count++;
    }
    dialog.querySelector(".extra-controls").hidden=!!q;
    workshops.hidden=!!q;
    if (q) {
      const matches = pairs.filter(
        ({ original, copy }) =>
          copy.matches("input,select,button") &&
          normalizeSearch(
            `${controlLabels[sourceKey(original)] || copy.getAttribute("aria-label")} ${original.id} ${original.textContent}`,
          ).includes(q),
      );
      count = matches.length;
      for (const { copy } of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = copy.getAttribute("aria-label");
        button.addEventListener("click", () => {
          selected = copy.closest("[data-control-category]").dataset
            .controlCategory;
          search.value = "";
          filter();
          copy.focus();
          copy.scrollIntoView({ block: "center" });
        });
        results.append(button);
      }
    }
    nav
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(!q && b.dataset.category === selected),
        ),
      );
    document.getElementById("control-empty").hidden = count > 0;
    content.parentElement.scrollTop = 0;
  }
  function sync() {
    if (!dialog.open) return;
    if (frame.contentDocument !== sourceDocument) {
      build();
      return;
    }
    for (const { original, copy } of pairs) {
      const tag = original.tagName;
      if (original.id === "llm-decision-feed") {
        copy.textContent = original.innerText || original.textContent;
        continue;
      }
      if (tag === "SELECT" && original.innerHTML !== copy.innerHTML)
        copy.innerHTML = original.innerHTML;
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(tag) &&
        document.activeElement !== copy
      ) {
        copy.value = original.value;
        if ("checked" in copy) copy.checked = original.checked;
      }
      if ("disabled" in original) {
        const commands = {
          launchMission: "launch",
          emergencyLand: "stop",
          takeoffAllDrones: "takeoff",
          landAllDrones: "land",
          returnToHome: "return",
        };
        const action =
          original.dataset.action ||
          (original.getAttribute("onclick") || "").split("(")[0];
        const primary =
          commands[action] &&
          document.querySelector(`[data-command="${commands[action]}"]`);
        copy.disabled = original.disabled || !!primary?.disabled;
      }
      if (
        !original.children.length &&
        !["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(tag)
      )
        copy.textContent =
          original.tagName === "BUTTON"
            ? controlLabels[sourceKey(original)] ||
              translateLabel(original.textContent)
            : translateLabel(original.textContent);
      // Keep sub-section contents open; preserve conditional scenario and metric details.
      if (["scenario-info", "emergence_submetics"].includes(original.id))
        copy.hidden = original.style.display === "none";
    }
  }
  document.getElementById("open-control-room").addEventListener("click", () => {
    build();
    dialog.showModal();
    sync();
    search.focus();
  });
  document
    .getElementById("close-control-room")
    .addEventListener("click", () => dialog.close());
  search.addEventListener("input", filter);
  search.addEventListener("keydown", (e) => {
    if (["Enter", "ArrowDown"].includes(e.key) && results.firstElementChild) {
      e.preventDefault();
      results.firstElementChild.focus();
    }
  });
  dialog.querySelectorAll("[data-workbench]").forEach((b) =>
    b.addEventListener("click", () => {
      dialog.close();
      openWorkbench(b.dataset.workbench);
    }),
  );
  document.addEventListener("keydown", (e) => {
    if (!e.defaultPrevented && !e.repeat && !document.querySelector("dialog[open]") && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      document.getElementById("open-control-room").click();
    }
  });
  const timer = setInterval(sync, 500);
  window.addEventListener("pagehide", () => clearInterval(timer));
  return { close: () => dialog.close() };
}
