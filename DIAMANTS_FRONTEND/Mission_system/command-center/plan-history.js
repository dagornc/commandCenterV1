/** Bounded, session-only history of draft targets. Never records flight commands. */
const copy = points => points.map(({x,z})=>({x,z}));
export class PlanHistory {
  constructor(limit=50) { this.limit=limit; this.past=[]; this.future=[]; }
  record(before,after,label) {
    if(JSON.stringify(before)===JSON.stringify(after)) return false;
    this.past.push({before:copy(before),after:copy(after),label});
    if(this.past.length>this.limit)this.past.shift();
    this.future=[];return true;
  }
  peek(direction) { const entry=(direction==='undo'?this.past:this.future).at(-1);return entry?{label:entry.label,points:copy(direction==='undo'?entry.before:entry.after)}:null; }
  move(direction) {
    const entry=(direction==='undo'?this.past:this.future).pop();
    if(!entry)return null;
    (direction==='undo'?this.future:this.past).push(entry);
    return copy(direction==='undo'?entry.before:entry.after);
  }
  clear(){this.past=[];this.future=[];}
}
