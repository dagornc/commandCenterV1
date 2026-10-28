import {isAirborne} from "./simulation-adapter.js";
import {drawRoute} from './order-review.js';
export function edgePosition(point,width,height,padding=24) {
 const cx=width/2,cy=height/2,dx=point.x-cx,dy=point.y-cy;
 const scale=Math.min(1,Math.max(0,(cx-padding))/Math.max(1,Math.abs(dx)),Math.max(0,(cy-padding))/Math.max(1,Math.abs(dy)));
 return {x:cx+dx*scale,y:cy+dy*scale,angle:Math.atan2(dy,dx)*180/Math.PI};
}
export class ReplayBuffer {
 constructor(limit=1800){this.limit=limit;this.frames=[];this.last=-Infinity;}
 capture(snapshot,now=Date.now()) {
  if(!snapshot.ready||now-this.last<1000)return;
  this.last=now;this.frames.push({at:now,bounds:{...snapshot.halfBounds},coverage:snapshot.coverage,started:snapshot.started,drones:snapshot.drones.map(d=>({id:d.id,name:d.name,phase:d.phase,position:d.position?{x:d.position.x,z:d.position.z}:null}))});
  if(this.frames.length>this.limit)this.frames.shift();
 }
 nearest(at,frames=this.frames){if(!frames.length)return -1;return frames.reduce((best,f,i)=>Math.abs(f.at-at)<Math.abs(frames[best].at-at)?i:best,0);}
}
export function initDecisionWorkspace({map,getSnapshot,getSelected,getAttention,getEvents,selectAgent,prepareAgent,onTactical}) {
 const $=id=>document.getElementById(id),stage=$('map-stage'),replay=new ReplayBuffer();
 const summary=document.createElement('button');summary.className='mission-summary';summary.id='mission-summary';summary.type='button';summary.title='État de mission et alerte prioritaire';summary.onclick=()=>{document.dispatchEvent(new CustomEvent('hud-reveal',{detail:$('attention-toggle')}));$('attention-toggle').focus();if($('attention-list').hidden)$('attention-toggle').click();};
 document.querySelector('.breadcrumb').replaceWith(summary);
 const mini=document.createElement('details');mini.className='overview-map';mini.open=innerWidth>=1100;mini.innerHTML='<summary>Vue globale</summary><canvas id="overview-canvas" width="180" height="120" tabindex="0" role="button" aria-label="Mini-carte : cliquer pour cadrer ; flèches pour déplacer la caméra"></canvas><small>Cadre : caméra tactique · clic : cadrage</small>';stage.append(mini);
 let extent=60;
 const overview=mini.querySelector('canvas');
 overview.onclick=e=>{const r=overview.getBoundingClientRect();onTactical();map.framing=null;map.center={x:((e.clientX-r.left)/r.width*2-1)*extent,z:((e.clientY-r.top)/r.height*2-1)*extent};map.draw();};
 overview.onkeydown=e=>{const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const offset=offsets[e.key];if(!offset)return;e.preventDefault();onTactical();map.framing=null;map.center={x:map.center.x+offset[0]*extent/10,z:map.center.z+offset[1]*extent/10};map.draw();};
 const edges=document.createElement('div');edges.className='alert-edges';stage.append(edges);const arrows=new Map();
 const actions=document.createElement('details');actions.className='selection-actions';actions.open=innerWidth>=1100;actions.innerHTML='<summary>Agent sélectionné</summary><div><button class="button" data-action="inspect">Inspecter</button><button class="button" data-action="center">Centrer</button><button class="button" data-action="move">Préparer déplacement</button><button class="button" data-action="return">Préparer retour</button></div>';stage.append(actions);
 actions.addEventListener('click',e=>{const action=e.target.dataset.action,id=getSelected();if(!action||!id)return;if(action==='inspect')selectAgent(id);else if(action==='center'){onTactical();map.focusAgent();}else prepareAgent(id,action);});
 let compact=innerWidth<1100;window.addEventListener('resize',()=>{const next=innerWidth<1100;if(next&&!compact){actions.open=false;mini.open=false;}compact=next;});
 const replayButton=document.createElement('button');replayButton.id='replay-open';replayButton.className='button';replayButton.textContent='Relire la session enregistrée';$('activity-panel').prepend(replayButton);
 const dialog=document.createElement('dialog');dialog.id='mission-replay';dialog.setAttribute('aria-labelledby','replay-title');dialog.innerHTML='<h2 id="replay-title">RELECTURE — le direct continue</h2><p>Positions observées chaque seconde, jusqu’aux 30 dernières minutes de cette session. Aucune commande depuis cette vue. Les périodes sans données ne sont pas interpolées.</p><canvas width="640" height="320" aria-label="Positions enregistrées et trace de l’agent choisi"></canvas><label>Agent suivi <select id="replay-agent"></select></label><label>Chronologie <input id="replay-time" type="range" min="0" value="0" step="1"></label><p id="replay-state" role="status"></p><div class="dialog-actions"><button class="button" id="replay-play">Lire</button><button class="button" id="replay-export">Exporter cet enregistrement</button><button class="button primary" id="replay-close">Retour au direct</button></div><ol id="replay-events"></ol>';document.body.append(dialog);
 let frames=[],playTimer=null;
 const stop=()=>{clearInterval(playTimer);playTimer=null;$('replay-play').textContent='Lire';};dialog.addEventListener('close',stop);$('replay-close').onclick=()=>dialog.close();
 function drawReplay(){const index=Number($('replay-time').value),f=frames[index];if(!f){$('replay-state').textContent='Aucune position enregistrée.';dialog.querySelector('canvas').getContext('2d').clearRect(0,0,640,320);return;}
  const id=$('replay-agent').value,trail=[];let lastAt=null;for(const frame of frames.slice(Math.max(0,index-180),index+1)){const d=frame.drones.find(d=>String(d.id)===id);if(!d?.position||(lastAt!==null&&frame.at-lastAt>2000))trail.length=0;if(d?.position)trail.push({type:'move',...d.position});lastAt=frame.at;}
  drawRoute(dialog.querySelector('canvas'),f.drones,trail,f.bounds,true,false,false);const d=f.drones.find(d=>String(d.id)===id);
  $('replay-state').textContent=`${new Date(f.at).toLocaleTimeString('fr-FR')} · Couverture ${f.coverage===null?'indisponible':f.coverage.toFixed(1)+' %'} · ${d?.name||'Agent absent'} : ${d?.phase||'sans donnée'}${index&&f.at-frames[index-1].at>2000?' · Interruption de télémétrie avant cet échantillon':''}`;
 }
 function openReplay(at){frames=replay.frames.map(f=>({...f,drones:f.drones.map(d=>({...d,position:d.position?{...d.position}:null}))}));$('replay-time').max=Math.max(0,frames.length-1);$('replay-time').value=at===undefined?Math.max(0,frames.length-1):Math.max(0,replay.nearest(at,frames));
  const agents=new Map();frames.forEach(f=>f.drones.forEach(d=>agents.set(String(d.id),d.name)));$('replay-agent').replaceChildren(...[...agents].map(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;return o;}));if(agents.has(String(getSelected())))$('replay-agent').value=String(getSelected());
  $('replay-events').replaceChildren(...getEvents().filter(e=>frames.length&&Date.parse(e.at)>=frames[0].at&&Date.parse(e.at)<=frames.at(-1).at+1000).map(event=>{const li=document.createElement('li'),button=document.createElement('button');button.className='button';button.textContent=`${new Date(event.at).toLocaleTimeString('fr-FR')} · ${event.message}`;button.onclick=()=>{$('replay-time').value=replay.nearest(Date.parse(event.at),frames);drawReplay();};li.append(button);return li;}));
  $('replay-play').disabled=$('replay-export').disabled=!frames.length;drawReplay();if(!dialog.open)dialog.showModal();
 }
 replayButton.onclick=()=>openReplay();$('activity-list').addEventListener('click',e=>{const row=e.target.closest('[data-event-at]');if(row)openReplay(Number(row.dataset.eventAt));});
 $('replay-time').oninput=()=>{stop();drawReplay();};$('replay-agent').onchange=drawReplay;
 $('replay-play').onclick=()=>{if(playTimer){stop();return;}if(Number($('replay-time').value)>=frames.length-1)$('replay-time').value=0;$('replay-play').textContent='Pause';playTimer=setInterval(()=>{const next=Number($('replay-time').value)+1;if(next>=frames.length){stop();return;}$('replay-time').value=next;drawReplay();},1000);};
 $('replay-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,frames,events:getEvents().filter(e=>frames.length&&Date.parse(e.at)>=frames[0].at&&Date.parse(e.at)<=frames.at(-1).at)},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='diamants-relecture.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function draw(){const snapshot=getSnapshot(),attention=getAttention();if(!map.width||!map.height)return;
  const view=drawRoute(overview,snapshot.drones,map.planPoints?.map(p=>({type:'move',...p}))||[],snapshot.halfBounds,false);extent=view.extent;
  const ctx=overview.getContext('2d'),a=view.project(map.unproject(0,0)),b=view.project(map.unproject(map.width,map.height));ctx.strokeStyle='#fff';ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
  const groups=new Map();for(const item of attention){if(!item.agentId)continue;const group=groups.get(item.agentId)||[];group.push(item);groups.set(item.agentId,group);}
  const visible=new Set();for(const [id,items] of groups){const drone=snapshot.drones.find(d=>d.id===id);if(!drone?.position)continue;const p=map.project(drone.position.x,drone.position.z);const marker=view.project(drone.position);ctx.fillStyle=items.some(i=>i.severity==='critical')?'#ff8872':'#eece80';ctx.fillRect(marker.x-4,marker.y-4,8,8);
   if(p.x>=20&&p.y>=20&&p.x<=map.width-20&&p.y<=map.height-20)continue;visible.add(id);let button=arrows.get(id);if(!button){button=document.createElement('button');button.className='edge-alert';button.type='button';button.onclick=()=>{onTactical();selectAgent(id);map.focusAgent();};edges.append(button);arrows.set(id,button);}const pos=edgePosition(p,map.width,map.height,40);button.style.left=pos.x+'px';button.style.top=pos.y+'px';button.textContent=`${['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(pos.angle/45)+8)%8]} ${drone.name} · ${items.length}`;button.title=items.map(i=>i.title).join('\n');button.setAttribute('aria-label',`Localiser ${drone.name} : ${items.map(i=>i.title).join(', ')}`);}
  for(const [id,button] of arrows)if(!visible.has(id)){button.remove();arrows.delete(id);}
  const drone=snapshot.drones.find(d=>d.id===getSelected());actions.hidden=!snapshot.ready||!drone?.position||map.editingPlan||Boolean(map.onPickTarget)||map.canResizeBounds;
  if(!actions.hidden){const p=map.project(drone.position.x,drone.position.z);actions.querySelector('summary').textContent=`${drone.name} · Actions`;actions.style.left=Math.max(8,Math.min(map.width-260,p.x+20))+'px';actions.style.top=Math.max(70,Math.min(map.height-145,p.y+25))+'px';}
 }
 map.onDraw=draw;
 return {update(){const snapshot=getSnapshot(),attention=getAttention();replay.capture(snapshot);const flying=snapshot.drones.filter(isAirborne).length;
  summary.textContent=`${!snapshot.ready?'HORS LIGNE':snapshot.started?'MISSION':'PRÊT'} · ${flying}/${snapshot.drones.length} en vol · ${snapshot.coverage===null?'—':snapshot.coverage.toFixed(0)+' %'} couv. · ${attention.length} alerte(s)${attention[0]?' · ⚠ '+attention[0].title:''}`;
  summary.title=attention[0]?`Priorité : ${attention[0].title} — ${attention[0].detail}`:'Aucun point d’attention détecté';summary.classList.toggle('critical',attention.some(i=>i.severity==='critical'));draw();},replay};
}
