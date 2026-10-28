/** Navigation shortcuts reuse existing controls; they never issue flight orders. */
export function initTacticalToolbar() {
  const $ = id => document.getElementById(id);
  const actions = [
    { key: 'p', label: 'Préparer', detail: 'Zone et objectifs', target: 'workspace-prepare' },
    { key: 's', label: 'Superviser', detail: 'Télémétrie des agents', target: 'workspace-supervise' },
    { key: 'g', label: 'Escadrons', detail: 'Sélection et files d’ordres', target: 'context-squad' },
    { key: 'f', label: 'Voir la flotte', detail: 'Cadrer tous les agents', target: 'fit-fleet' },
    { key: 'v', label: 'Vues mémorisées', detail: 'Retrouver un secteur', target: 'camera-bookmarks' },
    { key: 'a', label: 'Alerte suivante', detail: 'Examiner les points d’attention', target: 'attention-toggle' },
    { key: '?', label: 'Aide', detail: 'Gestes et raccourcis', target: 'help-button' },
  ];
  const bar = document.createElement('section');
  bar.className = 'tactical-toolbar';
  bar.setAttribute('aria-label', 'Accès tactiques');
  const heading = document.createElement('div');
  heading.className = 'tactical-toolbar-heading';
  heading.innerHTML = '<span class="eyebrow">ACCÈS TACTIQUES</span><span>Observer · préparer · coordonner</span>';
  bar.append(heading);
  const buttons = document.createElement('div');
  buttons.className = 'tactical-shortcuts';
  buttons.setAttribute('role', 'group');
  buttons.setAttribute('aria-label', 'Navigation rapide');
  bar.append(buttons);
  const hint = document.createElement('p');
  hint.id = 'tactical-context-hint';
  hint.setAttribute('role', 'status');
  bar.append(hint);
  document.querySelector('.operations-grid').before(bar);
  let lastAlert = null;
  function reveal(element) {
    element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    element.focus({ preventScroll: true });
  }
  function activate(action) {
    const target = $(action.target);
    if (!target || target.disabled) return;
    if (action.key === 'v') {
      target.open = true;
      reveal(target.querySelector('summary'));
    } else if (action.key === 'a') {
      const alerts = [...document.querySelectorAll('[data-attention-id]')];
      if ($('attention-list').hidden) target.click();
      if (!alerts.length) { reveal(target); return; }
      const next = alerts[(alerts.findIndex(el => el.dataset.attentionId === lastAlert) + 1) % alerts.length];
      lastAlert = next.dataset.attentionId;
      next.click();
      reveal(next);
    } else {
      target.click();
      if (action.key !== '?') reveal(target);
    }
    update();
  }
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tactical-shortcut';
    button.id = `tactical-${action.key === '?' ? 'help' : action.key}`;
    button.title = `${action.detail} (${action.key.toUpperCase()})`;
    button.setAttribute('aria-keyshortcuts', action.key);
    const label = document.createElement('span');
    label.textContent = action.label;
    const key = document.createElement('kbd');
    key.textContent = action.key.toUpperCase();
    button.append(label, key);
    button.addEventListener('click', () => activate(action));
    buttons.append(button);
  }
  function update() {
    const squad = $('context-squad').getAttribute('aria-pressed') === 'true';
    const preparing = document.body.dataset.workspace === 'prepare';
    hint.textContent = squad
      ? 'Sélection : Maj + glisser sur la carte · 1–9 : rappeler un escadron · Les ordres restent à exécuter explicitement.'
      : preparing
        ? 'Préparation : choisissez un outil dans Zone & objectifs, puis cliquez sur la carte. Le lancement reste manuel.'
        : 'Supervision : sélectionnez un agent sur la carte · F : cadrer la flotte · A : examiner les alertes.';
    for (const key of ['p', 's', 'g']) {
      const active = key === 'g' ? squad : !squad && (key === 'p' ? preparing : !preparing);
      $(`tactical-${key}`).setAttribute('aria-pressed', String(active));
    }
    const count = document.querySelectorAll('[data-attention-id]').length;
    $('tactical-a').classList.toggle('needs-attention', count > 0);
    $('tactical-a').title = `${count} point(s) d’attention · Alerte suivante (A)`;
  }
  const observer = new MutationObserver(update);
  observer.observe($('context-tools'), { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
  observer.observe($('attention-list'), { childList: true });
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-workspace'] });
  const onKey = event => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        event.target.closest?.('input,textarea,select,[contenteditable]') ||
        document.querySelector('dialog[open]') || $('map-stage').classList.contains('workbench')) return;
    const action = actions.find(item => item.key === event.key.toLowerCase());
    if (!action) return;
    event.preventDefault();
    activate(action);
  };
  document.addEventListener('keydown', onKey);
  const help = document.createElement('div');
  help.className = 'tactical-help';
  for (const action of actions) {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    const key = document.createElement('kbd'); key.textContent = action.key.toUpperCase();
    const label = document.createElement('span'); label.textContent = action.label;
    row.append(key, label); help.append(row);
  }
  $('help-dialog').querySelector('.dialog-note').before(help);
  update();
  window.addEventListener('pagehide', () => { observer.disconnect(); document.removeEventListener('keydown', onKey); }, { once: true });
}
