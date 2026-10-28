let dialog;
export function drawRoute(canvas, drones=[], orders=[], bounds={x:60,z:60},labels=true,connectStart=false,numberOrders=true) {
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const points=[...drones.map(d=>d.position).filter(Boolean),...orders.filter(o=>o.type==='move')];
 const extent=Math.max(10,bounds?.x||60,bounds?.z||60,...points.flatMap(p=>[Math.abs(p.x),Math.abs(p.z)]))*1.15;
 const project=p=>({x:w/2+p.x/extent*w/2,y:h/2+p.z/extent*h/2});
 ctx.fillStyle='#141d17';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#637557';ctx.strokeRect(w/2-(bounds?.x||60)/extent*w/2,h/2-(bounds?.z||60)/extent*h/2,(bounds?.x||60)/extent*w,(bounds?.z||60)/extent*h);
 if(connectStart){const first=orders.find(o=>o.type==='move');if(first){ctx.strokeStyle='#eea16c88';ctx.setLineDash([3,5]);for(const d of drones){if(!d.position)continue;const a=project(d.position),b=project(first);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.setLineDash([]);}}
 ctx.strokeStyle='#eea16c';ctx.setLineDash([5,4]);ctx.beginPath();orders.filter(o=>o.type==='move').forEach((o,i)=>{const p=project(o);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();ctx.setLineDash([]);
 for(const d of drones){if(!d.position)continue;const p=project(d.position);ctx.fillStyle='#b4cd88';ctx.fillRect(p.x-3,p.y-3,6,6);ctx.font='10px sans-serif';if(labels)ctx.fillText(d.name||String(d.id),p.x+5,p.y);}
 if(numberOrders)orders.filter(o=>o.type==='move').forEach((o,i)=>{const p=project(o);ctx.fillStyle='#eea16c';ctx.fillText(String(i+1),p.x,p.y);});
 return {extent,project};
}
export function reviewOrder({title,drones,orders=[],bounds,run}) {
 if(!dialog){dialog=document.createElement('dialog');dialog.id='order-review';dialog.setAttribute('aria-labelledby','order-review-title');dialog.innerHTML='<h2 id="order-review-title"></h2><p id="order-review-scope"></p><canvas width="480" height="230" aria-label="Aperçu indicatif des objectifs"></canvas><p>PRÉPARÉ · Segments indicatifs, sans prédiction de trajectoire ni garantie d’évitement. La simulation continue.</p><ol></ol><p id="order-review-status" role="status"></p><div class="dialog-actions"><button class="button" id="order-review-cancel">Revenir à la préparation</button><button class="button primary" id="order-review-confirm">Confirmer l’envoi</button></div>';document.body.append(dialog);dialog.querySelector('#order-review-cancel').onclick=()=>dialog.close();}
 if(dialog.open)return;
 dialog.querySelector('h2').textContent=title;
 dialog.querySelector('#order-review-scope').textContent=`${drones.length} agent(s) concernés : ${drones.map(d=>d.name||d.id).join(', ')}`;
 dialog.querySelector('ol').replaceChildren(...orders.map(o=>{const li=document.createElement('li');li.textContent=o.type==='move'?`Objectif X ${o.x}, Z ${o.z} m`:o.type==='wait'?`Attente ${o.seconds} s`:'Retour base et atterrissage';return li;}));
 drawRoute(dialog.querySelector('canvas'),drones,orders,bounds,true,true);
 dialog.querySelector('#order-review-status').textContent='Vérifiez la portée avant l’envoi. Les conditions seront revérifiées à la confirmation.';
 dialog.querySelector('#order-review-confirm').onclick=()=>{try{run();dialog.close();}catch(e){dialog.querySelector('#order-review-status').textContent=`Non transmis : ${e.message}`;}};
 dialog.showModal();
}
export function initFleetReview({getSnapshot,getPlan}) {
 const approved=new WeakSet();
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-command]');if(!button||button.disabled||button.dataset.command==='stop')return;
  if(approved.has(button)){approved.delete(button);return;}
  event.preventDefault();event.stopImmediatePropagation();
  const snap=getSnapshot(),command=button.dataset.command;
  reviewOrder({title:`Prévisualisation · ${button.textContent.trim()}`,drones:snap.drones,orders:command==='launch'?getPlan().map(p=>({type:'move',...p})):command==='return'?[{type:'return'}]:[],bounds:snap.halfBounds,run:()=>{
   if(JSON.stringify(getSnapshot().drones.map(d=>d.id))!==JSON.stringify(snap.drones.map(d=>d.id)))throw new Error('La flotte a changé. Recommencez la prévisualisation.');
   if(button.disabled||!getSnapshot().ready)throw new Error(button.dataset.unavailableReason||'Moteur indisponible.');
   approved.add(button);button.click();
  }});
 },true);
}
