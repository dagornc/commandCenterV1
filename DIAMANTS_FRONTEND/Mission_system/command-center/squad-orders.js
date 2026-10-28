/** Scoped order queues. No fleet-wide takeoff or exploration command is used. */
export class SquadOrders {
  constructor(controller) {
    this.controller = controller;
    this.engine = controller.autonomousFlightEngine;
    this.jobs = new Map();
    this.previous = this.engine.missionWaypointProvider;
    this.provider = (id, state) => {
      for (const job of this.jobs.values()) {
        if (job.status !== 'running' || !job.ids.includes(id)) continue;
        const order = job.orders[job.index];
        if (order?.type === 'move') return {...order, _label:`${job.name} · ordre ${job.index+1}/${job.orders.length}`};
      }
      return this.previous?.(id,state) ?? null;
    };
  }
  start(group, bounds) {
    if (!group.ids.length || !group.orders.length) throw new Error('Sélectionnez des drones et ajoutez au moins un ordre.');
    if (this.controller._missionStartTimer) throw new Error('Attendez la fin du décollage global avant de lancer un escadron.');
    if (this.jobs.get(group.id)?.status === 'running') throw new Error('Cet escadron exécute déjà ses ordres.');
    for (const id of group.ids) {
      const state=this.engine.drones.get(id);
      if (!state || state._returningToBase || ['LAND','LANDING'].includes(state.phase)) throw new Error('Un drone est absent ou en cours de retour/atterrissage.');
      if ([...this.jobs.values()].some(j=>j.status==='running' && j.ids.includes(id))) throw new Error('Un drone est déjà affecté à un escadron actif.');
    }
    group.orders.forEach((o,i)=>{
      if (!['move','wait','return'].includes(o.type)) throw new Error('Ordre inconnu.');
      if (o.type==='move' && (![o.x,o.z].every(Number.isFinite) || Math.abs(o.x)>bounds.x || Math.abs(o.z)>bounds.z)) throw new Error('Objectif hors de la zone d’exploration.');
      if (o.type==='wait' && (!Number.isFinite(o.seconds)||o.seconds<1||o.seconds>600)) throw new Error('Attente : 1 à 600 secondes.');
      if(o.type==='return' && i!==group.orders.length-1) throw new Error('Le retour doit être le dernier ordre.');
    });
    if(this.engine.missionWaypointProvider!==this.provider) {
      this.previous=this.engine.missionWaypointProvider;
      this.engine.missionWaypointProvider=this.provider;
    }
    const job={...group,ids:[...group.ids],orders:group.orders.map(o=>({...o})),index:0,status:'running',entered:false,started:false};
    this.jobs.set(group.id,job);
    this.controller.isRunning=true;
    this.controller.missionStarted=true;
    for(const id of job.ids) if(['IDLE','LANDED'].includes(this.engine.drones.get(id).phase)) this.engine.takeoff(id);
    return job;
  }
  hold(state) {
    state.phase='HOVER';
    state.hoverPosition=state.position.clone();
    state.waypoint=state.position.clone();
  }
  cancel(id, {hold = true} = {}) {
    const job=this.jobs.get(id);
    if(!job || job.status!=='running') return;
    job.status='cancelled';
    if (!hold) return;
    for(const id of job.ids) {
      const s=this.engine.drones.get(id);
      if(s && ['EXPLORE','HOVER'].includes(s.phase) && !s._returningToBase) this.hold(s);
    }
  }
  cancelAll(options) {for(const id of this.jobs.keys()) this.cancel(id, options);}
  tick(now=performance.now()) {
    if(!this.controller.missionStarted || !this.controller.isRunning || this.engine.missionWaypointProvider!==this.provider) {this.cancelAll({hold:false});return;}
    for(const job of this.jobs.values()) {
      if(job.status!=='running') continue;
      const states=job.ids.map(id=>this.engine.drones.get(id));
      if(states.some(s=>!s)) {this.cancel(job.id);continue;}
      if(states.some(s=>s.phase==='TAKEOFF')) continue;
      const order=job.orders[job.index];
      if(order.type!=='return' && states.some(s=>!['HOVER','EXPLORE'].includes(s.phase)||s._returningToBase)) {this.cancel(job.id);continue;}
      if(!job.entered) {
        job.entered=true;job.since=now;
        for(const s of states) {
          if(order.type==='move') {s.phase='EXPLORE';s.waypoint=null;s.waypointTimer=0;if(s.x500Dynamics) s.x500Dynamics.resetPIDs();}
          if(order.type==='wait') this.hold(s);
          if(order.type==='return') this.engine.returnToHome(s.id);
        }
      }
      const done=order.type==='move' ? states.every(s=>Math.hypot(s.position.x-order.x,s.position.z-order.z)<3)
        : order.type==='wait' ? now-job.since>=order.seconds*1000
        : states.every(s=>['IDLE','LANDED'].includes(s.phase));
      if(done) {
        job.index++;job.entered=false;
        if(job.index===job.orders.length) {
          job.status='done';
          if(order.type!=='return') states.forEach(s=>this.hold(s));
        }
      }
    }
    if([...this.engine.drones.values()].every(s=>['IDLE','LANDED'].includes(s.phase))) this.controller.missionStarted=false;
  }
}
