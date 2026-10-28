/** Searchable navigation. Destinations delegate to existing UI, never flight commands. */
export function initNavigationSearch() {
  const $ = id => document.getElementById(id);
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const destinations = [
    ['Préparer la mission', 'Zone, dimensions et objectifs', 'tactical-p'],
    ['Superviser les drones', 'Inspecteur et télémétrie', 'tactical-s'],
    ['Escadrons', 'Groupes, sélection et files d’ordres', 'tactical-g'],
    ['Cadrer la flotte', 'Retrouver tous les agents sur la carte', 'tactical-f'],
    ['Vues mémorisées', 'Secteurs et repères enregistrés', 'tactical-v'],
    ['Examiner les alertes', 'Prochain point d’attention', 'tactical-a'],
    ['Commandes & systèmes', 'Réglages, doctrine, altitude, balises', 'open-control-room'],
    ['Préférences', 'Étiquettes et animations', 'settings-button'],
    ['Aide', 'Gestes et raccourcis clavier', 'help-button'],
    ['Relire la session', 'Chronologie et positions enregistrées, sans commande de vol', 'replay-open'],
  ].map(([label, detail, target]) => ({label, detail, run: () => $(target)?.click()}));
  for (const button of document.querySelectorAll('#control-room [data-workbench]')) {
    destinations.push({label: button.textContent.trim(), detail: 'Atelier spécialisé · scène 3D', run: () => button.click()});
  }
  for (const [label, selector] of [['Bilans de mission', '.mission-history'], ['Journal d’activité', '#activity-list'], ['Liste des drones', '#fleet-search'], ['Bibliothèque de missions', '#mission-library'], ['Disposition des panneaux', '.hud-layout-settings']]) {
    destinations.push({label, detail: 'Consulter les informations de mission', run: () => {
      const target = document.querySelector(selector);
      if (!target) return;
      document.dispatchEvent(new CustomEvent('hud-reveal',{detail:target}));
      if(target.tagName==='DETAILS')target.open=true;
      target.scrollIntoView({block: 'center'});
      if (!target.matches('input')) target.tabIndex = -1;
      target.focus({preventScroll: true});
    }});
  }
  const trigger = document.createElement('button');
  trigger.id = 'navigation-search-open'; trigger.type = 'button'; trigger.className = 'button navigation-search-open';
  trigger.innerHTML = '<span>Rechercher un outil…</span><kbd>O</kbd>';
  trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-keyshortcuts', 'o');
  document.querySelector('.tactical-toolbar-heading').append(trigger);
  const help = document.createElement('div');
  help.className = 'shortcut-row';
  help.innerHTML = '<kbd>O</kbd><span>Rechercher un outil ou un panneau</span>';
  $('help-dialog').querySelector('.tactical-help').append(help);
  const dialog = document.createElement('dialog');
  dialog.id = 'navigation-search'; dialog.setAttribute('aria-labelledby', 'navigation-search-title');
  dialog.innerHTML = `<header><div><span class="eyebrow">ACCÈS RAPIDE</span><h2 id="navigation-search-title">Où souhaitez-vous aller ?</h2></div><button type="button" class="button" id="navigation-search-close">Fermer</button></header>
    <label for="navigation-query">Rechercher un outil ou un panneau</label><input id="navigation-query" type="search" placeholder="Escadrons, carte, altitude, communications…" autocomplete="off">
    <p id="navigation-result-count" role="status"></p><div id="navigation-results"></div>
    <footer>↑ ↓ Parcourir · Entrée Ouvrir · Échap Fermer</footer>`;
  document.body.append(dialog);
  const query = $('navigation-query'), results = $('navigation-results');
  let returnFocus, navigating = false;
  function render() {
    const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    const matches = destinations.filter(item => words.every(word => normalize(item.label + ' ' + item.detail).includes(word)));
    results.replaceChildren();
    $('navigation-result-count').textContent = matches.length ? `${matches.length} destinations` : 'Aucun résultat. Essayez « carte », « drone » ou « réglages ».';
    for (const item of matches) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'navigation-result';
      const label = document.createElement('strong'), detail = document.createElement('span');
      label.textContent = item.label; detail.textContent = item.detail;
      button.append(label, detail);
      button.onclick = () => { navigating = true; dialog.close(); item.run(); };
      results.append(button);
    }
  }
  function open() {
    if (document.querySelector('dialog[open]')) return;
    navigating = false; returnFocus = document.activeElement; query.value = ''; render(); dialog.showModal(); query.focus();
  }
  trigger.onclick = open;
  $('navigation-search-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { if (!navigating) returnFocus?.focus({preventScroll: true}); });
  query.addEventListener('input', render);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dialog.close(); return; }
    const buttons = [...results.children];
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && buttons.length) {
      event.preventDefault();
      const index = buttons.indexOf(document.activeElement);
      const next = index < 0 ? (event.key === 'ArrowDown' ? 0 : buttons.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    } else if (event.key === 'Enter' && event.target === query) {
      event.preventDefault(); buttons[0]?.click();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== 'o' ||
      event.target.closest?.('input,textarea,select,[contenteditable]') || document.querySelector('dialog[open]') || $('map-stage').classList.contains('workbench')) return;
    event.preventDefault(); open();
  });
}
