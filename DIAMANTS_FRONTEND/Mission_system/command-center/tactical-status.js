/** Compact navigation summaries use existing telemetry and queue states. */
export function initTacticalStatus() {
  const $=id=>document.getElementById(id);
  const badges={};
  for(const key of ['s','g','a']) {
    const button=$(`tactical-${key}`), label=button.querySelector('span');
    const badge=document.createElement('small'); badge.id=`tactical-status-${key}`;
    badge.className='tactical-status'; label.append(badge); badges[key]=badge;
  }
  const set=(key,text)=>{if(badges[key].textContent!==text)badges[key].textContent=text;};
  function update() {
    const airborne=$('metric-airborne').textContent.trim();
    set('s',airborne==='—'?'Télémétrie indisponible':`${Number(airborne)} en vol`);
    const squads=$('squads-title');
    set('g',`${squads.dataset.runningCount||0} actif(s) / ${squads.dataset.groupCount||0} groupe(s)`);
    const count=document.querySelectorAll('[data-attention-id]').length;
    const critical=document.querySelectorAll('[data-attention-id].critical').length;
    set('a',critical?`${critical} critique(s) · ${count} au total`:`${count} à examiner`);
  }
  const observer=new MutationObserver(update);
  observer.observe($('metric-airborne'),{childList:true,characterData:true,subtree:true});
  observer.observe($('attention-list'),{childList:true});
  observer.observe($('squads-title'),{attributes:true,attributeFilter:['data-group-count','data-running-count']});
  update();window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
