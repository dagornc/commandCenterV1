/** Shortcuts delegate to the original buttons so availability and review stay authoritative. */
export function initCommandShortcuts() {
 const dialog=document.getElementById('control-room');
 const entries=[
  ['launch','Lancer la mission','Flotte','.command-dock [data-command="launch"]'],
  ['takeoff','Décoller','Flotte','.command-dock [data-command="takeoff"]'],
  ['land','Atterrir','Flotte','.command-dock [data-command="land"]'],
  ['return','Retour à la base','Flotte','.command-dock [data-command="return"]'],
  ['squad','Exécuter la file','Escadron','#squad-run'],
  ['agent-return','Préparer un retour','Agent','.selection-actions [data-action="return"]'],
  ['agent-move','Préparer un déplacement','Agent','.selection-actions [data-action="move"]'],
 ].map(([id,label,scope,selector])=>({id,label,scope,selector}));
 const read=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?[...new Set(value.filter(id=>entries.some(e=>e.id===id)))].slice(0,7):[];}catch{return [];}};
 let favorites=read('diamants.command.favorites'),recent=read('diamants.command.recent');
 const persist=()=>{try{localStorage.setItem('diamants.command.favorites',JSON.stringify(favorites));localStorage.setItem('diamants.command.recent',JSON.stringify(recent));}catch{}};
 const box=document.createElement('details');box.id='command-shortcuts';box.innerHTML='<summary>Favoris et commandes récentes</summary><p>La portée utilise la sélection actuelle. Les confirmations d’envoi restent actives.</p><h3>Favoris</h3><div id="favorite-commands"></div><h3>Récentes</h3><div id="recent-commands"></div><details><summary>Choisir mes favoris</summary><div id="shortcut-catalog"></div></details>';
 dialog.querySelector('.control-scroll').prepend(box);
 const target=e=>document.querySelector(e.selector);
 function scope(e){if(e.scope==='Escadron')return `Escadron : ${document.getElementById('squad-groups').selectedOptions[0]?.textContent||'aucun sélectionné'}`;if(e.scope==='Agent')return `Agent : ${document.getElementById('agent-name').textContent}`;return 'Flotte entière';}
 function record(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,5);persist();render();}
 function action(e){const button=document.createElement('button');button.type='button';button.className='button shortcut-action';button.dataset.shortcut=e.id;button.textContent=e.label;const badge=document.createElement('small');badge.textContent=scope(e);button.append(badge);button.disabled=!target(e)||target(e).disabled;button.onclick=()=>{const original=target(e);if(!original||original.disabled)return;record(e.id);dialog.close();document.dispatchEvent(new CustomEvent('hud-reveal',{detail:original}));original.click();};return button;}
 function render(){for(const [id,items,empty] of [['favorite-commands',favorites,'Ajoutez vos commandes depuis « Choisir mes favoris ».'],['recent-commands',recent,'Vos derniers accès aux commandes apparaîtront ici.']]){const root=box.querySelector('#'+id);root.replaceChildren();if(!items.length){const p=document.createElement('p');p.textContent=empty;root.append(p);}for(const key of items)root.append(action(entries.find(e=>e.id===key)));}
  const catalog=box.querySelector('#shortcut-catalog');catalog.replaceChildren();for(const e of entries){const b=document.createElement('button');b.type='button';b.className='button';b.dataset.favorite=e.id;b.setAttribute('aria-pressed',String(favorites.includes(e.id)));b.textContent=`${favorites.includes(e.id)?'★':'☆'} ${e.label} · ${e.scope}`;b.onclick=()=>{favorites=favorites.includes(e.id)?favorites.filter(id=>id!==e.id):[...favorites,e.id];persist();render();box.querySelector(`[data-favorite="${e.id}"]`).focus();};catalog.append(b);}
 }
 // Update state without rebuilding focused controls while the console is in use.
 function refresh(){if(!dialog.open)return;box.hidden=!!document.getElementById('control-search').value.trim();for(const b of box.querySelectorAll('[data-shortcut]')){const e=entries.find(e=>e.id===b.dataset.shortcut);b.disabled=!target(e)||target(e).disabled;b.querySelector('small').textContent=scope(e);}}
 document.addEventListener('click',event=>{const original=event.target.closest('button');const e=entries.find(e=>target(e)===original);if(e&&!original.disabled)record(e.id);});
 document.getElementById('control-search').addEventListener('input',refresh);
 new MutationObserver(refresh).observe(dialog,{attributes:true,attributeFilter:['open']});
 const timer=setInterval(refresh,500);window.addEventListener('pagehide',()=>clearInterval(timer));render();
}
