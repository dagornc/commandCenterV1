import { reviewOrder } from "./order-review.js";
import {orderProgress,copyOrders} from "./order-progress.js";
import {SquadOrders} from './squad-orders.js';
export function initSquads({frame,map,getSnapshot,getPlan,notify,onFocus,onMapFocus}) {
  const $=id=>document.getElementById(id);
  const selection=new Set(), groups=[];
  const availability=document.createElement('p');
  availability.id='squad-availability'; availability.className='availability-hint';
  $('squad-run').parentElement.after(availability);
  for(const id of ['squad-add','squad-plan','squad-members','squad-delete','squad-run']) $(id).setAttribute('aria-describedby',availability.id);
  let active=null, runner=null, counter=0;
  const current=()=>groups.find(g=>g.id===active);
  const job=()=>runner?.jobs.get(active);
  const busy=()=>job()?.status==='running';
  const label=o=>o.type==='move'?`Rejoindre X ${o.x}, Z ${o.z} m`:o.type==='wait'?`Attendre ${o.seconds} s`:'Retour à la base et atterrissage';
  const focusTarget=document.createElement('button');focusTarget.id='squad-focus-target';focusTarget.className='button';focusTarget.textContent="Centrer l’objectif actif";
  $('squad-status').after(focusTarget);
  focusTarget.onclick=()=>{const p=orderProgress(job(),runner?.engine)?.target;if(!p)return;onMapFocus?.();map.framing=null;map.center={x:p.x,z:p.z};map.draw();};
  const copyBox=document.createElement('div');copyBox.className='plan-actions';
  const copyLabel=document.createElement('label');copyLabel.textContent='Copier les ordres d’un autre escadron';
  const sourceSelect=document.createElement('select');sourceSelect.id='squad-copy-source';copyLabel.append(sourceSelect);
  const copyButton=document.createElement('button');copyButton.id='squad-copy-orders';copyButton.className='button';copyButton.textContent='Ajouter cette file';
  copyBox.append(copyLabel,copyButton);$('squad-orders').before(copyBox);
  copyButton.onclick=()=>attempt(()=>{const source=groups.find(g=>g.id===sourceSelect.value);if(!source)throw new Error('Choisissez une file source.');current().orders=copyOrders(source.orders,current().orders);clearResult();});
  function clearResult(){if(!busy())runner?.jobs.delete(active);}
  function updateProgress(){
    const summary=$('squads-title');
    const total=String(groups.length), running=String([...runner?.jobs.values()||[]].filter(j=>j.status==='running').length);
    if(summary.dataset.groupCount!==total) summary.dataset.groupCount=total;
    if(summary.dataset.runningCount!==running) summary.dataset.runningCount=running;
    const progress=orderProgress(job(),runner?.engine);
    $('squad-status').textContent=progress?.text || 'Prêt à préparer une file d’ordres.';
    focusTarget.disabled=!progress?.target;
    map.squadTarget=progress?.target || null;
    $('squad-orders').querySelectorAll('[data-order-state]').forEach((el,i)=>{
      const state=progress?.rows[i] || 'pending';
      el.textContent={pending:'À venir',active:'En cours',done:'Terminé',cancelled:'Annulé'}[state];
      el.closest('li').dataset.state=state;
      if(state==='active')el.closest('li').setAttribute('aria-current','step');else el.closest('li').removeAttribute('aria-current');
    });
  }
  function render() {
    $('squad-member-count').textContent=`${selection.size} sélectionné(s)`;
    for(const id of ['squad-step-members','squad-step-name','squad-step-create'])$(id).removeAttribute('aria-current');
    $(selection.size?'squad-step-create':'squad-step-members').setAttribute('aria-current','step');
    map.selectedIds=selection;map.squadPath=current()?.orders.filter(o=>o.type==='move') || [];map.draw();
    $('squad-selection').textContent=`${selection.size} drone(s) sélectionné(s) · Maj + glisser sur la carte pour sélectionner un rectangle.`;
    $('squad-groups').replaceChildren(...groups.map(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=`${g.name} · ${g.ids.length} drones`;return o;}));
    $('squad-groups').value=active || '';
    const g=current(), j=job();
    $('squad-orders').replaceChildren(...(g?.orders||[]).map((o,i)=>{
      const li=document.createElement('li');li.append(`${label(o)} `);
      const badge=document.createElement('span');badge.className='order-state';badge.dataset.orderState='';li.append(badge);
      for(const [text,delta] of [['↑',-1],['↓',1],['Supprimer',0]]) {
        const b=document.createElement('button');b.type='button';b.className='button';b.textContent=text;
        b.setAttribute('aria-label',`${text==='Supprimer'?'Supprimer':delta<0?'Monter':'Descendre'} l’ordre ${i+1}`);
        b.disabled=busy() || (delta<0&&i===0)||(delta>0&&i===g.orders.length-1);
        b.onclick=()=>{if(delta){[g.orders[i],g.orders[i+delta]]=[g.orders[i+delta],g.orders[i]];}else g.orders.splice(i,1);clearResult();render();};li.append(b);
      }return li;
    }));
    for(const id of ['squad-add','squad-plan','squad-members','squad-delete']) $(id).disabled=!g||busy();
    $('squad-run').disabled=!g||busy()||!g.orders.length;
    availability.textContent=!g?'Créez ou sélectionnez un escadron pour préparer ses ordres.':busy()?'File en cours : attendez sa fin ou annulez-la avant de la modifier.':!g.orders.length?'Ajoutez au moins un ordre pour exécuter la file.':`Prêt : cette file concerne uniquement ${g.ids.length} drone(s) de ${g.name}.`;
    $('squad-stop').disabled=!busy();
    const selectedSource=sourceSelect.value;
    sourceSelect.replaceChildren(...groups.filter(other=>other.id!==active && other.orders.length).map(other=>{const option=document.createElement('option');option.value=other.id;option.textContent=`${other.name} · ${other.orders.length} ordres`;return option;}));
    if([...sourceSelect.options].some(o=>o.value===selectedSource))sourceSelect.value=selectedSource;
    sourceSelect.disabled=!g||busy()||!sourceSelect.options.length;copyButton.disabled=sourceSelect.disabled;
    updateProgress();
    $('squad-members-list').replaceChildren(...getSnapshot().drones.map(d=>{
      const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=selection.has(d.id);input.value=d.id;
      input.onchange=()=>{input.checked?selection.add(d.id):selection.delete(d.id);render();};label.append(input,` ${d.name}`);return label;
    }));
  }
  function attempt(fn){try{fn();render();}catch(e){notify(e.message,true);}}
  $('squad-create').onclick=()=>attempt(()=>{
    if(!selection.size){$('squad-member-picker').open=true;$('squad-members-list').querySelector('input')?.focus();$('squad-create-status').textContent='Étape 1 : sélectionnez au moins un drone.';throw new Error('Sélectionnez au moins un drone.');}
    if(groups.length>=9) throw new Error('Neuf escadrons maximum.');
    const name=$('squad-name').value.trim()||`Escadron ${counter+1}`;
    active=String(++counter);groups.push({id:active,name,ids:[...selection],orders:[]});
    $('squad-create-status').textContent=`${name} créé avec ${selection.size} membre(s). Vous pouvez préparer ses ordres.`;
  });
  $('squad-groups').onchange=e=>{active=e.target.value;selection.clear();current()?.ids.forEach(id=>selection.add(id));render();};
  $('squad-members').onclick=()=>attempt(()=>{if(!selection.size)throw new Error('Sélectionnez au moins un drone.');current().ids=[...selection];clearResult();});
  $('squad-delete').onclick=()=>{const g=current();if(!g||busy())return;groups.splice(groups.indexOf(g),1);active=groups[0]?.id??null;selection.clear();current()?.ids.forEach(id=>selection.add(id));render();};
  $('squad-add').onclick=()=>attempt(()=>{
    const type=$('squad-order-type').value;
    const o=type==='move'?{type,x:Number($('squad-x').value),z:Number($('squad-z').value)}:type==='wait'?{type,seconds:Number($('squad-seconds').value)}:{type};
    if(current().orders.length>=48) throw new Error('48 ordres maximum.');
    current().orders.push(o);clearResult();
  });
  $('squad-plan').onclick=()=>attempt(()=>{
    const points=getPlan();if(!points.length)throw new Error('Tracez d’abord des objectifs dans le préparateur.');
    if(current().orders.length+points.length>48)throw new Error('48 ordres maximum.');
    current().orders.push(...points.map(p=>({type:'move',...p})));clearResult();
  });
  $('squad-run').onclick=()=>attempt(()=>{
    const c=frame.contentWindow?.diamantsSystem?.integratedController;
    if(!c)throw new Error('Moteur indisponible.');
    if(!runner || runner.controller!==c) {
      runner=new SquadOrders(c);
      frame.contentWindow.addEventListener('diamants:mission-status', event=>{
        if(['LAUNCH','TAKEOFF','EMERGENCY_STOP'].includes(event.detail?.phase)){runner?.cancelAll({hold:false});render();}
      });
    }
    const draft={...current(),ids:[...current().ids],orders:current().orders.map(o=>({...o}))};
    reviewOrder({title:`Ordres de ${draft.name}`,drones:getSnapshot().drones.filter(d=>draft.ids.includes(d.id)),orders:draft.orders,bounds:getSnapshot().halfBounds,run:()=>{
      if(frame.contentWindow?.diamantsSystem?.integratedController!==c)throw new Error('Le moteur a changé. Préparez à nouveau les ordres.');
      runner.start(draft,getSnapshot().halfBounds);render();notify(`${draft.name} : file acceptée par le simulateur pour ${draft.ids.length} drones.`);
    }});
  });
  $('squad-stop').onclick=()=>{runner?.cancel(active);render();};
  map.onSelectGroup=ids=>{onFocus?.();selection.clear();ids.forEach(id=>selection.add(id));render();};
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||$('map-stage').classList.contains('workbench')||e.target.closest('input,textarea,select,[contenteditable]'))return;
    const g=groups[Number(e.key)-1];if(!g)return;
    onFocus?.();active=g.id;selection.clear();g.ids.forEach(id=>selection.add(id));render();e.preventDefault();
  });
  let last='';
  return {getOrders:()=>current()?.orders.map(o=>({...o}))||[],applyOrders(orders){if(!current()||busy())throw new Error('Sélectionnez un escadron inactif avant de charger la file.');current().orders=orders.map(o=>({...o}));clearResult();onFocus?.();render();},prepareAgent(id,type='move') {
    const d=getSnapshot().drones.find(d=>d.id===id);if(!d)return;
    onFocus?.();selection.clear();selection.add(id);
    if(groups.length>=9){notify('Neuf escadrons maximum : utilisez un escadron existant.',true);return;}
    active=String(++counter);groups.push({id:active,name:`Ordres ${d.name}`,ids:[id],orders:type==='return'?[{type:'return'}]:[]});render();
    if(type==='move'){$('squad-order-type').value='move';$('squad-order-type').dispatchEvent(new Event('change'));$('squad-pick-target').click();}
  },tick(){runner?.tick();const sig=JSON.stringify([getSnapshot().drones.map(d=>d.id),[...runner?.jobs.values()||[]].map(j=>[j.id,j.status,j.index])]);if(sig!==last){last=sig;render();}else updateProgress();},cancel(){runner?.cancelAll();render();}};
}
