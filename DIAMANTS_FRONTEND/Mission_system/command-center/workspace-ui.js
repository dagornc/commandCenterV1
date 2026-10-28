/** Rearrange tools without moving or reloading the simulation iframe. */
export function initWorkspace({map,onPrepareMap,onCancelEditing}) {
  const $=id=>document.getElementById(id);
  const grid=document.querySelector('.operations-grid');
  const panels={zone:document.querySelector('[aria-labelledby="plan-title"]'),squad:document.querySelector('[aria-labelledby="squads-title"]'),agent:$('agent-inspector')};
  const bar=document.createElement('section');bar.className='workspace-switch panel';
  bar.innerHTML='<div role="group" aria-label="Espace de travail"><button class="button" id="workspace-prepare" aria-pressed="true">Préparer</button><button class="button" id="workspace-supervise" aria-pressed="false">Superviser</button></div><p id="workspace-description">Définissez la zone et préparez les ordres, avec la carte à côté.</p>';
  grid.before(bar);
  const side=document.createElement('aside');side.id='context-tools';side.setAttribute('aria-label','Outils contextuels');
  side.innerHTML='<nav aria-label="Panneau contextuel"><button class="button" id="context-zone" aria-pressed="true">Zone & objectifs</button><button class="button" id="context-squad" aria-pressed="false">Escadrons</button><button class="button" id="context-agent" aria-pressed="false">Drone</button></nav>';
  for(const panel of Object.values(panels)) side.append(panel);
  grid.append(side);grid.classList.add('context-layout');
  let mode='prepare', active='zone';
  function show(name) {
    cancelPick();
    if(name!=="zone") onCancelEditing();
    if(name==='zone' && mode==='supervise') setMode('prepare');
    active=name;
    for(const [key,panel] of Object.entries(panels)) {
      panel.hidden=key!==name;
      $('context-'+key).setAttribute('aria-pressed',String(key===name));
    }
    // Inspector visibility is now governed by the context selector.
    grid.classList.remove('inspector-collapsed');
    map.resize();
  }
  function setMode(next) {
    mode=next;document.body.dataset.workspace=mode;
    $('workspace-prepare').setAttribute('aria-pressed',String(mode==='prepare'));
    $('workspace-supervise').setAttribute('aria-pressed',String(mode==='supervise'));
    $('context-zone').hidden=mode==='supervise';
    $('workspace-description').textContent=mode==='prepare'?'Définissez la zone et préparez les ordres, avec la carte à côté.':'Suivez les drones, les escadrons et les alertes. Les réglages préparés sont conservés.';
    show(mode==='prepare'?'zone':'agent');
  }
  $('workspace-prepare').onclick=()=>setMode('prepare');
  $('workspace-supervise').onclick=()=>setMode('supervise');
  for(const key of Object.keys(panels)) $('context-'+key).onclick=()=>show(key);
  $('toggle-inspector').hidden=true;
  const pick=document.createElement('button');pick.id='squad-pick-target';pick.className='button';pick.type='button';pick.textContent='Choisir sur la carte';
  $('squad-add').before(pick);
  const hint=document.createElement('p');hint.id='squad-pick-status';hint.setAttribute('role','status');pick.parentElement.after(hint);
  function cancelPick() {map.onPickTarget=null;pick.setAttribute('aria-pressed','false');hint.textContent='';}
  function orderFields() {
    cancelPick();const type=$('squad-order-type').value;
    for(const id of ['squad-x','squad-z']) $(id).closest('label').hidden=type!=='move';
    $('squad-seconds').closest('label').hidden=type!=='wait';pick.hidden=type!=='move';
  }
  $('squad-order-type').addEventListener('change',orderFields);
  pick.onclick=()=>{
    if(map.onPickTarget){cancelPick();return;}
    onPrepareMap();map.fitBounds();pick.setAttribute('aria-pressed','true');
    hint.textContent='Cliquez sur la cible dans la carte, puis ajoutez l’ordre. Échap pour annuler.';
    map.onPickTarget=p=>{
      const b=map.snapshot.halfBounds;
      if(Math.abs(p.x)>b.x || Math.abs(p.z)>b.z){hint.textContent='Choisissez une cible à l’intérieur de la zone.';return;}
      $('squad-x').value=Math.round(p.x*10)/10;$('squad-z').value=Math.round(p.z*10)/10;
      cancelPick();hint.textContent='Cible choisie. Cliquez sur Ajouter l’ordre pour la placer dans la file.';
      $('squad-add').focus({preventScroll:true});
    };
    $('map-stage').scrollIntoView({block:'center'});
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelPick();});
  orderFields();setMode('prepare');
  return {show};
}
