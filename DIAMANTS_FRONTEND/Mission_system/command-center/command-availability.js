/** Same predicate supplies both the disabled state and its explanation. */
export function fleetCommandReason(command, snapshot, returning, airborne) {
  if (!snapshot.ready) return 'Moteur indisponible : attendez la connexion au simulateur.';
  if (command === 'launch' && returning) return 'Retour en cours : attendez que les drones soient posés.';
  if (command === 'launch' && snapshot.started && snapshot.running) return 'Mission déjà en cours : surveillez sa progression.';
  if (['land','return','stop'].includes(command) && !snapshot.drones.some(d => !['IDLE','LANDED'].includes(d.phase)))
    return 'Flotte au sol : aucun vol à interrompre ni drone à ramener.';
  if (command === 'takeoff' && airborne > 0) return 'Des drones sont déjà en vol : le décollage global est indisponible.';
  return '';
}
export function initCommandAvailability() {
  const panel = document.createElement('details');
  panel.className = 'command-availability';
  panel.innerHTML = '<summary>Disponibilité des commandes de flotte</summary><p>Ces commandes concernent toute la flotte. Les ordres d’escadron restent dans leur panneau.</p><ul></ul>';
  document.querySelector('.tactical-toolbar').after(panel);
  const buttons = [...document.querySelectorAll('[data-command]')];
  const labels = {launch:'Lancer',takeoff:'Décoller',land:'Atterrir',return:'Retour base',stop:'Arrêt'};
  const rows = new Map();
  for (const button of buttons) {
    const key = button.dataset.command;
    if (!rows.has(key)) {
      const li = document.createElement('li'); li.id=`availability-${key}`;
      panel.querySelector('ul').append(li); rows.set(key,li);
    }
    const ids = new Set((button.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    ids.add(rows.get(key).id); button.setAttribute('aria-describedby',[...ids].join(' '));
  }
  function update() {
    let unavailable = 0;
    for (const [key,row] of rows) {
      const reason = buttons.find(b=>b.dataset.command===key).dataset.unavailableReason || '';
      row.textContent=`${labels[key] || key} — ${reason || 'Disponible pour toute la flotte.'}`;
      row.classList.toggle('unavailable',Boolean(reason));
      if(reason) unavailable++;
      for (const button of buttons.filter(b=>b.dataset.command===key)) button.title=reason || `${labels[key]} · Toute la flotte`;
    }
    panel.querySelector('summary').textContent = `Commandes de flotte · ${unavailable} indisponible(s) — voir pourquoi`;
  }
  const observer=new MutationObserver(update);
  for(const button of buttons) observer.observe(button,{attributes:true,attributeFilter:['data-unavailable-reason']});
  update();
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
