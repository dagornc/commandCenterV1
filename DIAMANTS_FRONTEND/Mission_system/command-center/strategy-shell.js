import { interfaceAudio } from "./interface-audio.js";
/** Fixed HUD. Move controls only; never reparent the simulation iframe. */
export function initStrategyShell({map}) {
  const body=document.body;
  body.classList.add('strategy-shell');
  const states={top:false,left:innerWidth>=1100,right:innerWidth>=1100,bottom:false};
  const panels={}, buttons={};
  const widths={left:284,right:324},pinned={top:false,left:innerWidth>=1100,right:innerWidth>=1100,bottom:false};
  const selectors={top:['.metrics','.attention-center'],left:['.rail','.workspace-switch','.tactical-toolbar','.command-access','.command-availability','#fleet-panel'],right:['#context-tools'],bottom:['.activity-panel','.mission-history','.page-heading','.page-footer']};
  const labels={top:'Situation',left:'Navigation',right:'Inspection',bottom:'Actions & historique'};
  for(const side of Object.keys(states)) {
    const panel=document.createElement('aside');panel.id=`hud-${side}`;panel.className=`hud-panel hud-${side}`;panel.setAttribute('aria-label',labels[side]);
    for(const selector of selectors[side]) {const el=document.querySelector(selector);if(el)panel.append(el);}
    body.append(panel);panels[side]=panel;
    const button=document.createElement('button');button.id=`hud-toggle-${side}`;button.className=`hud-toggle hud-toggle-${side}`;button.type='button';button.textContent=labels[side];button.setAttribute('aria-controls',panel.id);
    button.onclick=()=>set(side,!states[side]);body.append(button);buttons[side]=button;
    const header=document.createElement('header');header.className='hud-panel-header';
    const title=document.createElement('strong');title.textContent=labels[side];
    const pin=document.createElement('button');pin.type='button';pin.className='button hud-pin';pin.id=`hud-pin-${side}`;pin.setAttribute('aria-label',`Épingler ${labels[side]}`);pin.onclick=()=>{setPinned(side,!pinned[side]);};
    const close=document.createElement('button');close.type='button';close.className='button';close.textContent='Fermer';close.onclick=()=>set(side,false);header.append(title,pin,close);panel.prepend(header);

  }
  let lastOpened='right';
  const isPinned=side=>pinned[side]&&innerWidth>=1100&&(!['top','bottom'].includes(side)||innerHeight>=800);
  function normalize() {
    const previews=Object.keys(states).filter(side=>states[side]&&!isPinned(side));
    const keep=previews.includes(lastOpened)?lastOpened:previews.at(-1);
    for(const side of previews)if(side!==keep)states[side]=false;
  }
  function setPinned(side,value){pinned[side]=value;lastOpened=side;render();}
  function render() {
    normalize();
    for(const side of Object.keys(states))if(!states[side]&&panels[side].contains(document.activeElement))buttons[side].focus();
    for(const side of Object.keys(states)) {body.dataset[`hud${side[0].toUpperCase()+side.slice(1)}`]=String(states[side]);panels[side].hidden=!states[side];panels[side].dataset.mode=states[side]?(isPinned(side)?'pinned':'preview'):'collapsed';const pin=document.getElementById(`hud-pin-${side}`);pin.textContent=pinned[side]?'Épinglé':'Épingler';pin.setAttribute('aria-pressed',String(pinned[side]));const checkbox=document.getElementById(`layout-pin-${side}`);if(checkbox)checkbox.checked=pinned[side];buttons[side].setAttribute('aria-expanded',String(states[side]));buttons[side].title=`${states[side]?'Replier':'Déplier'} ${labels[side]}`;}
    const reserved=['left','right'].filter(side=>states[side]&&pinned[side]).reduce((sum,side)=>sum+widths[side],0),ratio=Math.min(1,Math.max(440,innerWidth-468)/Math.max(1,reserved));
    for(const side of ['left','right']){const width=Math.round(widths[side]*(pinned[side]?ratio:1));body.style.setProperty(`--hud-${side}-width`,`${width}px`);body.style.setProperty(`--hud-${side}`,`${states[side]&&pinned[side]&&innerWidth>=1100?width+(side==='left'?46:42):side==='left'?46:42}px`);}
    const verticalSizes={top:Math.min(260,Math.floor(innerHeight*.3)),bottom:Math.min(242,Math.floor(innerHeight*.3))};
    const verticalReserved=['top','bottom'].filter(side=>states[side]&&isPinned(side)).reduce((sum,side)=>sum+verticalSizes[side],0);
    const verticalRatio=Math.min(1,Math.max(0,innerHeight-440)/Math.max(1,verticalReserved));
    for(const [side,base] of [['top',52],['bottom',88]]){const height=Math.floor(verticalSizes[side]*(isPinned(side)?verticalRatio:1));body.style.setProperty(`--hud-${side}-size`,`${height}px`);body.style.setProperty(`--hud-${side}`,`${base+(states[side]&&isPinned(side)?height:0)}px`);}
    for(const side of ['left','right'])document.querySelector(`.hud-resize-${side}`)?.setAttribute('aria-valuenow',String(widths[side]));
    requestAnimationFrame(()=>map.resize());
  }
  function set(side,open) {
    if(states[side]!==open)interfaceAudio.play(open?"open":"close");
    if(!open && panels[side].contains(document.activeElement))buttons[side].focus();
    if(open)lastOpened=side;
    if(open)for(const other of Object.keys(states))if(other!==side&&states[other]&&!isPinned(other))states[other]=false;
    states[side]=open;render();
  }
  // Existing navigation and keyboard shortcuts must reveal their destination.
  document.addEventListener('click',event=>{
    const id=event.target.closest('[id]')?.id;
    const nav=event.target.closest('[data-nav]')?.dataset.nav;
    if(nav==='fleet')set('left',true);
    if(nav==='activity')set('bottom',true);
    if(['workspace-prepare','workspace-supervise','context-zone','context-squad','context-agent','tactical-p','tactical-s','tactical-g'].includes(id))set('right',true);
    if(id==='tactical-a')set('top',true);
  },true);
  const contextObserver=new MutationObserver(()=>{if(!panels.right.hidden)return;set('right',true);});
  document.querySelectorAll('#context-tools nav button').forEach(b=>contextObserver.observe(b,{attributes:true,attributeFilter:['aria-pressed']}));
  document.addEventListener('focusin',event=>{for(const side of Object.keys(states))if(panels[side].contains(event.target)&&!states[side])set(side,true);});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.target.closest('input,textarea,select,[contenteditable=true]')&&!document.querySelector('dialog[open]'))set('left',true);},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){const side=Object.keys(states).find(s=>states[s]&&!isPinned(s)&&panels[s].contains(document.activeElement))||Object.keys(states).reverse().find(s=>states[s]&&!isPinned(s));if(side)set(side,false);}});
  map.canvas.addEventListener('pointerdown',()=>{for(const side of Object.keys(states))if(states[side]&&!isPinned(side))set(side,false);});
  window.addEventListener('resize',()=>{render();});
  const layout=document.createElement('details');layout.className='hud-layout-settings';layout.innerHTML='<summary>Disposition des panneaux</summary><label>Profil <select id="layout-profile"><option value="prepare">Préparation</option><option value="supervise">Supervision</option><option value="analyse">Analyse</option></select></label><div class="plan-actions"><button class="button" id="layout-load">Appliquer</button><button class="button" id="layout-save">Mémoriser</button><button class="button" id="layout-reset">Réinitialiser</button></div><p id="layout-status" role="status"></p>';
  panels.left.prepend(layout);
  for(const side of ['left','right']) {
    const row=document.createElement('label');row.textContent=`Largeur ${side==='left'?'gauche':'droite'} `;
    const input=document.createElement('input');input.type='range';input.min=220;input.max=420;input.step=10;input.value=widths[side];input.id=`layout-width-${side}`;input.oninput=()=>{widths[side]=Number(input.value);render();};row.append(input);layout.append(row);
    const pinLabel=document.createElement('label'),pin=document.createElement('input');pin.type='checkbox';pin.id=`layout-pin-${side}`;pin.onchange=()=>setPinned(side,pin.checked);pinLabel.append(pin,` Épingler le panneau ${side==='left'?'gauche':'droit'} (Échap le laisse ouvert)`);layout.append(pinLabel);
  }
  const profiles={prepare:{states:{top:false,left:true,right:true,bottom:false}},supervise:{states:{top:false,left:false,right:true,bottom:false}},analyse:{states:{top:true,left:false,right:false,bottom:true},pinned:{top:true,bottom:true}}};
  let saved={};try{saved=JSON.parse(localStorage.getItem('diamants.command.layouts')||'{}')||{};}catch{}
  function apply(profile){for(const side of Object.keys(states))if(typeof profile.states?.[side]==='boolean')states[side]=profile.states[side];for(const side of ['left','right']){if(Number.isFinite(profile.widths?.[side]))widths[side]=Math.max(220,Math.min(420,profile.widths[side]));pinned[side]=profile.pinned?.[side]??true;document.getElementById(`layout-width-${side}`).value=widths[side];document.getElementById(`layout-pin-${side}`).checked=pinned[side];}for(const side of ['top','bottom'])pinned[side]=profile.pinned?.[side]===true;lastOpened=Object.keys(states).filter(side=>states[side]).at(-1)||lastOpened;render();}
  const profile=()=>document.getElementById('layout-profile').value;
  document.getElementById('layout-load').onclick=()=>apply(saved[profile()]||profiles[profile()]);
  document.getElementById('layout-save').onclick=()=>{saved[profile()]={states:{...states},widths:{...widths},pinned:{...pinned}};try{localStorage.setItem('diamants.command.layouts',JSON.stringify(saved));document.getElementById('layout-status').textContent='Disposition mémorisée sur cet appareil.';}catch{document.getElementById('layout-status').textContent='Disposition conservée dans cette session seulement.';}};
  document.getElementById('layout-reset').onclick=()=>{delete saved[profile()];try{localStorage.setItem('diamants.command.layouts',JSON.stringify(saved));}catch{}apply({...profiles[profile()],widths:{left:284,right:324}});};
  document.addEventListener('hud-reveal',event=>{for(const side of Object.keys(states))if(panels[side].contains(event.detail))set(side,true);});
  render();
  return {set, isOpen:side=>states[side], width:side=>widths[side], resize(side,value){widths[side]=Math.max(220,Math.min(420,Math.round(value)));document.getElementById(`layout-width-${side}`).value=widths[side];render();}};
}
