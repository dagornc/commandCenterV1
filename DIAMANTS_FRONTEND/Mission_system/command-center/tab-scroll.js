/** Show real overflow and provide keyboard-accessible horizontal scrolling. */
export function initTabScroll() {
 for(const nav of document.querySelectorAll('.hud-tabs>.hud-tablist,#control-categories')) {
  const wrapper=document.createElement('div');wrapper.className='tab-scroll';
  if(nav.id==='control-categories')wrapper.classList.add('console-tab-scroll');
  nav.before(wrapper);wrapper.append(nav);
  if(!nav.id)nav.id=`scroll-${nav.parentElement.parentElement.classList.contains('hud-tabs-top')?'top':'bottom'}`;
  const before=document.createElement('button'),after=document.createElement('button');
  for(const [button,direction,label,glyph] of [[before,-1,'Faire défiler les onglets vers la gauche','‹'],[after,1,'Faire défiler les onglets vers la droite','›']]){
   button.type='button';button.className='tab-scroll-button';button.textContent=glyph;button.setAttribute('aria-label',label);button.setAttribute('aria-controls',nav.id);button.hidden=true;
   button.onclick=()=>nav.scrollBy({left:direction*Math.max(100,nav.clientWidth*.75),behavior:'instant'});
  }
  wrapper.prepend(before);wrapper.append(after);
  let scheduled=false;
  function update(){scheduled=false;
   // Measure without arrows so they cannot create overflow by themselves.
   const available=wrapper.clientWidth;
   if(!available)return;
   const overflow=nav.scrollWidth>available+2;
   before.hidden=after.hidden=!overflow;
   before.disabled=nav.scrollLeft<=1;after.disabled=nav.scrollLeft+nav.clientWidth>=nav.scrollWidth-2;
   wrapper.classList.toggle('has-tab-overflow',overflow);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  nav.addEventListener('scroll',schedule,{passive:true});
  new ResizeObserver(schedule).observe(nav);
  new MutationObserver(schedule).observe(nav,{childList:true,subtree:true,characterData:true});
  nav.addEventListener('focusin',event=>{if(event.target.matches('button'))event.target.scrollIntoView({block:'nearest',inline:'nearest'});schedule();});
  schedule();
 }
}
