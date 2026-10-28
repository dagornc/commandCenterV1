/** Present only observed queue state; elapsed waits are not travel estimates. */
export function orderProgress(job, engine, now = performance.now()) {
  if (!job) return null;
  const order = job.orders[job.index];
  const states = job.ids.map(id => engine?.drones.get(id));
  const total = job.ids.length;
  const rows = job.orders.map((_, index) => {
    if (job.status === 'done' || index < job.index) return 'done';
    if (job.status === 'cancelled') return 'cancelled';
    return index === job.index ? 'active' : 'pending';
  });
  if (job.status === 'done') return {rows, text:'Terminé · drones au sol ou en maintien de position.', target:null};
  if (job.status === 'cancelled') return {rows, text:'File annulée · les ordres restants ne seront pas exécutés.', target:null};
  const ready = states.filter(s => s && !['IDLE','TAKEOFF'].includes(s.phase)).length;
  let detail;
  if (states.some(s => s?.phase === 'TAKEOFF')) detail = `Décollage · ${ready}/${total} drones prêts`;
  else if (order?.type === 'move') {
    const arrived = states.filter(s => s && Math.hypot(s.position.x-order.x,s.position.z-order.z)<3).length;
    detail = `${arrived}/${total} drones arrivés`;
  } else if (order?.type === 'wait') {
    detail = job.entered ? `Attente · ${Math.max(0,Math.ceil(order.seconds-(now-job.since)/1000))} s restantes` : 'Préparation de l’attente';
  } else if (order?.type === 'return') {
    detail = `${states.filter(s=>s && ['IDLE','LANDED'].includes(s.phase)).length}/${total} drones au sol`;
  } else detail = 'En attente du moteur';
  return {rows, text:`En cours · ordre ${job.index+1}/${job.orders.length} · ${detail}`, target:order?.type==='move'?{x:order.x,z:order.z,step:job.index+1}:null};
}
export function copyOrders(source, destination, limit=48) {
  if (!source.length) throw new Error('La file source est vide.');
  if (source.length+destination.length>limit) throw new Error(`${limit} ordres maximum.`);
  return [...destination.map(o=>({...o})),...source.map(o=>({...o}))];
}
