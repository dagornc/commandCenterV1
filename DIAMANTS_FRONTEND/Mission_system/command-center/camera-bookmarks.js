/** Local map views: camera and display layers only, never mission commands. */
export const CAMERA_BOOKMARKS_KEY = 'diamants.command.views';
const LIMIT = 6;
const LAYERS = ['trails', 'links', 'coverage'];

function validView(view) {
  return view && typeof view.id === 'string' && view.id.length > 0 && view.id.length <= 80
    && typeof view.name === 'string' && view.name.trim().length > 0 && view.name.length <= 40
    && view.center && ['x', 'z'].every(axis => Number.isFinite(view.center[axis]) && Math.abs(view.center[axis]) <= 100000)
    && Number.isFinite(view.zoom) && view.zoom >= 0.001 && view.zoom <= 9
    && view.layers && LAYERS.every(key => typeof view.layers[key] === 'boolean');
}
function cloneView(view) {
  return {
    id: view.id, name: view.name.trim(),
    center: {x: view.center.x, z: view.center.z}, zoom: view.zoom,
    layers: Object.fromEntries(LAYERS.map(key => [key, view.layers[key]])),
  };
}
/** Reject invalid storage atomically; return detached, allowlisted data. */
export function validateCameraBookmarks(value) {
  if (!Array.isArray(value) || value.length > LIMIT || !value.every(validView)
    || new Set(value.map(view => view.id)).size !== value.length) return null;
  return value.map(cloneView);
}
export function readCameraBookmarks(storage) {
  let raw;
  try { raw = storage.getItem(CAMERA_BOOKMARKS_KEY); }
  catch { return {bookmarks: [], status: 'unavailable'}; }
  if (raw === null) return {bookmarks: [], status: 'empty'};
  try {
    const bookmarks = validateCameraBookmarks(JSON.parse(raw));
    return bookmarks ? {bookmarks, status: 'saved'} : {bookmarks: [], status: 'corrupt'};
  } catch { return {bookmarks: [], status: 'corrupt'}; }
}

export function initCameraBookmarks({map, container, storage, notify = () => {}, onRecall = () => {}}) {
  const doc = container.ownerDocument;
  const loaded = readCameraBookmarks(storage);
  let bookmarks = loaded.bookmarks;
  let counter = 0;
  const element = doc.createElement('details');
  element.id = 'camera-bookmarks'; element.className = 'camera-bookmarks';
  const summary = doc.createElement('summary');
  const description = doc.createElement('p');
  description.textContent = 'Mémorisez un cadrage et ses calques. Rappeler une vue ne modifie pas la mission.';
  const controls = doc.createElement('div'); controls.className = 'view-bookmark-controls';
  const label = doc.createElement('label'); label.htmlFor = 'view-name'; label.textContent = 'Nom du repère';
  const input = doc.createElement('input'); input.id = 'view-name'; input.maxLength = 40;
  input.placeholder = 'Secteur nord'; input.type = 'text'; label.append(input);
  const save = doc.createElement('button'); save.id = 'view-save'; save.type = 'button';
  save.className = 'button'; save.textContent = 'Enregistrer cette vue';
  controls.append(label, save);
  const status = doc.createElement('p'); status.id = 'view-storage-status'; status.setAttribute('role', 'status');
  const list = doc.createElement('ol'); list.id = 'view-bookmarks';
  element.append(summary, description, controls, status, list); container.append(element);
  if (loaded.status === 'unavailable') status.textContent = 'Stockage local indisponible : les repères resteront dans cette session.';
  else if (loaded.status === 'corrupt') status.textContent = 'Les repères enregistrés sont invalides et n’ont pas été chargés.';
  else status.textContent = 'Jusqu’à six repères enregistrés sur cet appareil.';

  function persist() {
    try {
      storage.setItem(CAMERA_BOOKMARKS_KEY, JSON.stringify(bookmarks));
      status.textContent = 'Repères enregistrés sur cet appareil.';
    } catch {
      status.textContent = 'Enregistrement local indisponible : repères conservés pour cette session seulement.';
      notify(status.textContent, true);
    }
  }
  function render() {
    summary.textContent = `Repères de carte · ${bookmarks.length}/${LIMIT}`;
    save.disabled = bookmarks.length >= LIMIT;
    save.title = save.disabled ? 'Supprimez un repère pour en enregistrer un nouveau.' : 'Enregistrer le cadrage et les calques actuels';
    list.replaceChildren(...bookmarks.map(view => {
      const row = doc.createElement('li'); row.dataset.viewId = view.id;
      const recall = doc.createElement('button'); recall.type = 'button'; recall.className = 'button view-recall';
      recall.textContent = view.name; recall.setAttribute('aria-label', `Rappeler la vue ${view.name}`);
      recall.addEventListener('click', () => {
        const copy = cloneView(view);
        map.framing = null; map.center = {...copy.center}; map.zoom = copy.zoom; map.layers = {...copy.layers};
        onRecall(copy); map.draw();
        status.textContent = `Vue « ${view.name} » rappelée. Mission inchangée.`;
      });
      const remove = doc.createElement('button'); remove.type = 'button'; remove.className = 'button view-remove';
      remove.textContent = 'Supprimer'; remove.setAttribute('aria-label', `Supprimer la vue ${view.name}`);
      remove.addEventListener('click', () => {
        bookmarks = bookmarks.filter(item => item.id !== view.id); persist(); render();
        save.focus({preventScroll: true});
      });
      row.append(recall, remove); return row;
    }));
  }
  save.addEventListener('click', () => {
    if (bookmarks.length >= LIMIT) return;
    let id;
    do { id = `view-${Date.now()}-${++counter}`; } while (bookmarks.some(view => view.id === id));
    const view = {
      id,
      name: input.value.trim() || `Vue ${bookmarks.length + 1}`,
      center: map.center, zoom: map.zoom, layers: map.layers,
    };
    if (!validView(view)) { notify('Ce cadrage ne peut pas être enregistré. Recentrez la carte puis réessayez.', true); return; }
    bookmarks.push(cloneView(view)); persist(); input.value = ''; render();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); save.click(); }
  });
  render();
  return {element, getBookmarks: () => bookmarks.map(cloneView)};
}
