export function readStored(storage,key,fallback) {
  try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function validPlan(value) {
  return Array.isArray(value) && value.length<=24 && value.every(p=>p && Number.isFinite(p.x) && Number.isFinite(p.z)) ? value.map(({x,z})=>({x,z})) : [];
}
/** Only observed airborne activity creates a report. Offline samples cannot finish it. */
export class MissionRecorder {
  constructor(){this.active=null;}
  update(snapshot,now=Date.now()) {
    if(!snapshot.ready) {if(this.active)this.active.interrupted=true;return null;}
    const flying=snapshot.drones.filter(d=>!['IDLE','LANDED'].includes(d.phase)).length;
    if(!this.active && flying) this.active={startedAt:now,agents:snapshot.drones.length,peakFlying:flying,interrupted:false};
    if(!this.active)return null;
    this.active.agents=Math.max(this.active.agents,snapshot.drones.length);
    this.active.peakFlying=Math.max(this.active.peakFlying,flying);
    if(flying || snapshot.started || !snapshot.drones.length)return null;
    if(snapshot.drones.every(d=>d.phase==="IDLE")){this.active=null;return null;}
    const report={...this.active,endedAt:now,durationMs:Math.max(0,now-this.active.startedAt),coverage:Number.isFinite(snapshot.coverage)?snapshot.coverage:null};
    this.active=null;return report;
  }
  reset(){this.active=null;}
}
export function validReports(value) {
 return Array.isArray(value)?value.filter(r=>r && Number.isFinite(r.endedAt) && Number.isFinite(r.durationMs) && r.durationMs>=0 && Number.isFinite(r.agents) && Number.isFinite(r.peakFlying) && (r.coverage===null || Number.isFinite(r.coverage))).slice(0,5):[];
}
