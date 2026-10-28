/** Organize existing nodes; preserve handlers, input state and the live iframe. */
export function initHudOrganization({shell}) {
 const $=id=>document.getElementById(id),groups=[];
 const take=selector=>document.querySelector(selector);
 function tabs(side,definitions,{rail=false}={}) {
  const root=document.createElement('div');root.className=`hud-tabs hud-tabs-${side}`;
  const nav=document.createElement('nav');nav.className='hud-tablist';nav.setAttribute('role','tablist');nav.setAttribute('aria-label',`Outils ${side}`);nav.setAttribute('aria-orientation',rail?'vertical':'horizontal');root.append(nav);
  const entries=definitions.map(([key,label,symbol,nodes])=>{
   const button=document.createElement('button');button.type='button';button.id=`hud-tab-${key}`;button.setAttribute('role','tab');button.setAttribute('aria-controls',`hud-pane-${key}`);button.setAttribute('aria-label',label);button.title=label;
   const glyph=document.createElement('span');glyph.textContent=symbol;glyph.setAttribute('aria-hidden','true');const text=document.createElement('span');text.textContent=label;button.append(glyph,text);
   const pane=document.createElement('section');pane.className='hud-tabpane';pane.id=`hud-pane-${key}`;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',button.id);pane.tabIndex=0;
   for(const node of nodes.filter(Boolean))pane.append(node);
   nav.append(button);root.append(pane);return {key,button,pane};
  });
  let active=entries[0].key;
  function select(key,open=true){active=key;if(key==='library')$('mission-library').open=true;if(key==='layout')take('.hud-layout-settings').open=true;for(const e of entries){e.pane.hidden=e.key!==key;e.button.setAttribute('aria-selected',String(e.key===key));e.button.tabIndex=e.key===key?0:-1;}if(open)shell.set(side,true);if(side==='bottom')syncOrderScope();}
  for(const e of entries)e.button.onclick=()=>{if(rail&&active===e.key&&shell.isOpen(side))shell.set(side,false);else select(e.key);};
  nav.onkeydown=event=>{const index=entries.findIndex(e=>e.button===event.target);if(index<0)return;let next=index;if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%entries.length;else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index-1+entries.length)%entries.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=entries.length-1;else return;event.preventDefault();select(entries[next].key);entries[next].button.focus();};
  $(`hud-${side}`).append(root);if(rail){document.body.append(nav);nav.classList.add('hud-left-rail');}select(active,false);if(rail)new MutationObserver(()=>{for(const e of entries)e.button.setAttribute('aria-expanded',String(shell.isOpen(side)&&e.key===active));}).observe($(`hud-toggle-${side}`),{attributes:true,attributeFilter:['aria-expanded']});groups.push({side,entries,select});return {select};
 }
 const squadNav=document.createElement('section');squadNav.innerHTML='<h2>Escadrons</h2><p>Sélectionnez une équipe pour préparer ses ordres dans l’inspecteur.</p><div id="hud-squad-list"></div><button class="button" id="hud-squad-create">Créer ou modifier une équipe</button>';
 const openSquad=()=>{$('context-squad').click();};squadNav.querySelector('button').onclick=openSquad;
 const list=$('squad-groups');let squadSignature='';
 const orderScope=$('hud-bottom').querySelector('.hud-panel-header strong');orderScope.id='hud-order-scope';orderScope.setAttribute('aria-live','polite');
 function syncOrderScope(){const ordersTab=$('hud-tab-orders');const isOrders=!ordersTab||ordersTab.getAttribute('aria-selected')==='true';const label=isOrders?`Ordres · ${list.selectedOptions[0]?.textContent||'aucun escadron sélectionné'}`:'Actions & historique';if(orderScope.textContent!==label)orderScope.textContent=label;}

 function syncSquads(){syncOrderScope();const signature=list.innerHTML+list.value;if(signature===squadSignature)return;squadSignature=signature;squadNav.querySelector('#hud-squad-list').replaceChildren(...[...list.options].map(option=>{const b=document.createElement('button');b.type='button';b.className='button';b.textContent=option.textContent;b.setAttribute('aria-pressed',String(option.value===list.value));b.onclick=()=>{list.value=option.value;list.dispatchEvent(new Event('change',{bubbles:true}));openSquad();};return b;}));}
 new MutationObserver(syncSquads).observe(list,{childList:true,subtree:true,characterData:true});list.addEventListener('change',syncSquads);syncSquads();
 const shortcuts=document.createElement('details');shortcuts.innerHTML='<summary>Tous les raccourcis</summary>';shortcuts.append(take('.tactical-toolbar'));
 // Keep the search trigger directly available in the fixed rail.
 const search=shortcuts.querySelector('#navigation-search-open');search.classList.add('hud-search');document.body.append(search);search.title='Rechercher un outil (O)';
 const left=tabs('left',[
  ['fleet','Flotte','◉',[take('#fleet-panel')]],
  ['teams','Escadrons','◇',[squadNav]],
  ['missions','Missions','◎',[take('.workspace-switch'),take('.command-access')]],
  ['library','Bibliothèque','▤',[take('#mission-library')]],
  ['layout','Disposition et aide','⚙',[take('.hud-layout-settings'),shortcuts,take('.rail')]],
 ],{rail:true});
 const top=tabs('top',[
  ['indicators','Indicateurs','▥',[take('.metrics')]],
  ['alerts','Alertes','!',[take('.attention-center')]],
 ]);
 const orderPane=document.createElement('div');orderPane.innerHTML='<h2>File de l’escadron sélectionné</h2><p>Portée : uniquement les membres de l’escadron. L’envoi passe par la prévisualisation.</p>';
 for(const id of ['squad-status','squad-focus-target','squad-orders','squad-run','squad-stop'])orderPane.append($(id));
 const replayPane=document.createElement('div');replayPane.innerHTML='<h2>Relecture</h2><p>Consultez les positions enregistrées et les événements. Le direct continue pendant la relecture.</p>';replayPane.append($('replay-open'));
 const history=take('.mission-history');history.append($('export-button'));
 const bottom=tabs('bottom',[
  ['orders','Ordres','↦',[orderPane]],['journal','Journal','≡',[take('.activity-panel'),take('.command-availability')]],['replay','Relecture','▷',[replayPane]],['reports','Bilans','▥',[history,take('.page-footer')]],
 ]);
 take('.page-heading').classList.add('hud-legacy-heading');
 const density=document.createElement('label');density.className='setting-row';density.innerHTML='<span>Densité de l’interface<small>Espacement et taille des informations</small></span><select id="hud-density"><option value="comfortable">Confort</option><option value="compact">Compact</option></select>';
 $('settings-dialog').querySelector('.dialog-note').before(density);
 const densitySelect=$('hud-density');try{if(localStorage.getItem('diamants.command.density')==='compact')densitySelect.value='compact';}catch{}
 const applyDensity=()=>{document.body.dataset.density=densitySelect.value;try{localStorage.setItem('diamants.command.density',densitySelect.value);}catch{}};densitySelect.onchange=applyDensity;applyDensity();
 const textSize=document.createElement('label');textSize.className='setting-row';textSize.innerHTML='<span>Taille du texte<small>Indépendante de la densité</small></span><select id="hud-text-size"><option value="1">100 %</option><option value="1.15">115 %</option><option value="1.3">130 %</option></select>';
 density.after(textSize);const sizeSelect=$('hud-text-size');try{const value=localStorage.getItem('diamants.command.textSize');if(['1','1.15','1.3'].includes(value))sizeSelect.value=value;}catch{}
 const applyTextSize=()=>{document.body.style.setProperty('--text-scale',sizeSelect.value);try{localStorage.setItem('diamants.command.textSize',sizeSelect.value);}catch{}};sizeSelect.onchange=applyTextSize;applyTextSize();
 const scope=document.createElement('span');scope.className='fleet-command-scope';scope.textContent='PORTÉE : FLOTTE';$('dock-actions').before(scope);
 // Inspector details remain in place, with progressive disclosure.
 for(const [selector,label,open] of [['.agent-hero','Modèle de l’agent',false],['.telemetry-grid','Télémétrie',true],['.mission-progress','Progression de mission',false]]){
  const node=take(selector);if(!node)continue;const details=document.createElement('details');details.className='inspector-section';details.open=open;const summary=document.createElement('summary');summary.textContent=label;details.append(summary);node.before(details);details.append(node);
 }
 const rightRail=document.createElement('nav');rightRail.className='hud-right-rail';rightRail.setAttribute('aria-label','Inspecter');
 for(const [id,symbol,label] of [['context-zone','⌖','Zone et objectifs'],['context-squad','◇','Escadron'],['context-agent','◉','Drone']]){const b=document.createElement('button');b.type='button';b.className='hud-context-tab';b.title=label;b.setAttribute('aria-label',label);b.textContent=symbol;b.setAttribute('aria-controls','hud-right');const sync=()=>b.setAttribute('aria-pressed',String($(id).getAttribute('aria-pressed')==='true'));new MutationObserver(sync).observe($(id),{attributes:true,attributeFilter:['aria-pressed']});sync();b.onclick=()=>$(id).click();rightRail.append(b);}document.body.append(rightRail);
 $('hud-toggle-left').textContent='‹';$('hud-toggle-right').textContent='›';$('hud-toggle-left').setAttribute('aria-label','Replier ou ouvrir la navigation');$('hud-toggle-right').setAttribute('aria-label','Replier ou ouvrir l’inspecteur');
 function reveal(target){if(!(target instanceof Element))return;for(const group of groups){const entry=group.entries.find(e=>e.pane.contains(target));if(entry)group.select(entry.key);}}
 document.addEventListener('hud-reveal',e=>reveal(e.detail));
 document.addEventListener('click',e=>{const id=e.target.closest('[id]')?.id,nav=e.target.closest('[data-nav]')?.dataset.nav;
  if(nav==='fleet')left.select('fleet');if(nav==='activity')bottom.select('journal');
  if(id==='tactical-a'||id==='mission-summary')top.select('alerts');
  if(['squad-add','squad-plan','squad-run','squad-copy-orders'].includes(id))bottom.select('orders');
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.target.closest('input,textarea,select,[contenteditable]')&&!document.querySelector('dialog[open]'))left.select('fleet');},true);
 // Actual pointer drag and keyboard resizing; controls stay outside scrolling panes.
 for(const side of ['left','right']){
  const handle=document.createElement('div');handle.className=`hud-resize hud-resize-${side}`;handle.role='separator';handle.tabIndex=0;handle.setAttribute('aria-label',`Largeur du panneau ${side==='left'?'gauche':'droit'}`);handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-valuemin','220');handle.setAttribute('aria-valuemax','420');
  let drag=null;const update=value=>{shell.resize(side,value);handle.setAttribute('aria-valuenow',String(shell.width(side)));};update(shell.width(side));
  handle.onpointerdown=e=>{drag={x:e.clientX,width:shell.width(side)};handle.setPointerCapture(e.pointerId);e.preventDefault();};handle.onpointermove=e=>{if(drag)update(drag.width+(e.clientX-drag.x)*(side==='left'?1:-1));};handle.onpointerup=handle.onpointercancel=()=>drag=null;
  handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();update(e.key==='Home'?220:e.key==='End'?420:shell.width(side)+(e.key==='ArrowRight'?1:-1)*(side==='left'?10:-10));};$(`hud-${side}`).append(handle);
 }
 // Routes selected before tab organization should remain reachable.
 return {reveal};
}
