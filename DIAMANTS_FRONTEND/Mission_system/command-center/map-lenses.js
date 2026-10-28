/** Reading presets only: they never modify a mission, selection or camera. */
export const MAP_LENSES = {
  exploration: { label: 'Exploration', layers: { trails: false, links: false, coverage: true }, description: 'Cellules déjà visitées. Une cellule vide ne garantit pas une zone sûre.' },
  coordination: { label: 'Coordination', layers: { trails: false, links: true, coverage: false }, description: 'Distances entre agents à moins de 30 m ; ce ne sont pas des liaisons radio mesurées.' },
  movement: { label: 'Déplacements', layers: { trails: true, links: false, coverage: false }, description: 'Trajectoires observées des agents ; elles ne prédisent pas leur trajet futur.' },
};
export function matchingLens(layers) {
  return Object.entries(MAP_LENSES).find(([, lens]) => Object.entries(lens.layers).every(([key, value]) => layers[key] === value))?.[0] || 'custom';
}
export function initMapLenses({ map, onChange, onTactical }) {
  const stage = document.querySelector('.map-stage');
  const bar = document.createElement('div');
  bar.className = 'map-lenses';
  bar.innerHTML = `<label for="map-lens">Lecture de carte</label><select id="map-lens" aria-describedby="map-lens-description"><option value="custom">Personnalisée</option>${Object.entries(MAP_LENSES).map(([id, lens]) => `<option value="${id}">${lens.label}</option>`).join('')}</select><span id="map-lens-description" role="status"></span>`;
  stage.before(bar);
  const select = bar.querySelector('select'), description = bar.querySelector('span');
  const sync = () => {
    select.value = matchingLens(map.layers);
    description.textContent = MAP_LENSES[select.value]?.description || 'Combinez librement les calques sous la carte.';
  };
  select.addEventListener('change', () => {
    const lens = MAP_LENSES[select.value];
    if (!lens) { sync(); return; }
    Object.assign(map.layers, lens.layers);
    document.querySelectorAll('[data-layer]').forEach(button => {
      const active = map.layers[button.dataset.layer];
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    onTactical();
    onChange();
    map.draw();
    sync();
  });
  // Manual toggles and saved camera recalls remain authoritative.
  const observer = new MutationObserver(sync);
  document.querySelectorAll('[data-layer]').forEach(button => observer.observe(button, { attributes: true, attributeFilter: ['aria-pressed'] }));
  sync();
  return () => { observer.disconnect(); bar.remove(); };
}
