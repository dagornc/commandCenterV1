/** Local synthesized feedback: no downloads, microphone or external service. */
export function createInterfaceAudio({storage, AudioContextClass, now=()=>performance.now()}={}) {
  let enabled=true,volume=0.25,context,master,unlocked=false;
  const last=new Map();
  try {const saved=JSON.parse(storage?.getItem('diamants.command.audio')||'null');if(typeof saved?.enabled==='boolean')enabled=saved.enabled;if(Number.isFinite(saved?.volume))volume=Math.max(0,Math.min(1,saved.volume));}catch{}
  const save=()=>{try{storage?.setItem('diamants.command.audio',JSON.stringify({enabled,volume}));}catch{}};
  function unlock(){
    unlocked=true;
    if(!enabled||!AudioContextClass)return;
    try{if(!context){context=new AudioContextClass();master=context.createGain();master.gain.value=volume;master.connect(context.destination);}if(context.state==='suspended')context.resume().catch(()=>{});}catch{}
  }
  const patterns={click:[520],open:[440,660],close:[550,330],info:[480,560],success:[520,660,780],warning:[440,330],error:[220,180,220]};
  function play(kind='click') {
    if(!enabled||volume===0||!unlocked||!context||context.state!=='running')return false;
    const key=['click','open','close'].includes(kind)?'interaction':kind==='error'?'error':'event';
    const t=now();if(t-(last.get(key)??-Infinity)<(key==='interaction'?65:900))return false;
    last.set(key,t);
    try{(patterns[kind]||patterns.info).forEach((frequency,i)=>{
      const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+i*0.065;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(0.12,start+0.008);gain.gain.exponentialRampToValueAtTime(0.001,start+0.085);
      oscillator.connect(gain);gain.connect(master);oscillator.start(start);oscillator.stop(start+0.1);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    });return true;}catch{return false;}
  }
  return {play,unlock,get enabled(){return enabled;},get volume(){return volume;},setEnabled(value){enabled=Boolean(value);if(master)master.gain.value=enabled?volume:0;save();if(enabled)unlock();},setVolume(value){if(!Number.isFinite(value))return;volume=Math.max(0,Math.min(1,value));if(master)master.gain.value=enabled?volume:0;save();},dispose(){context?.close().catch(()=>{});}};
}
let storage;try{storage=window.localStorage;}catch{}
export const interfaceAudio=createInterfaceAudio({storage,AudioContextClass:window.AudioContext||window.webkitAudioContext});
export function initInterfaceAudio(){
  const form=document.querySelector('#settings-dialog form');
  const controls=document.createElement('div');
  controls.innerHTML='<label class="setting-row"><span>Sons de l’interface<small>Panneaux, boutons et événements de mission</small></span><input id="interface-sounds" type="checkbox"></label><label class="setting-row"><span>Volume des sons</span><input id="interface-volume" type="range" min="0" max="100" step="5" aria-label="Volume des sons"></label><button class="button subtle" type="button" id="interface-sound-test">Écouter un aperçu</button>';
  form.querySelector('.dialog-note').before(controls);
  const toggle=controls.querySelector('#interface-sounds'),slider=controls.querySelector('#interface-volume'),preview=controls.querySelector('button');
  toggle.checked=interfaceAudio.enabled;slider.value=String(interfaceAudio.volume*100);
  const sync=()=>{slider.disabled=!toggle.checked;preview.disabled=!toggle.checked;};sync();
  toggle.onchange=()=>{interfaceAudio.setEnabled(toggle.checked);sync();if(toggle.checked)interfaceAudio.play('open');};
  slider.oninput=()=>interfaceAudio.setVolume(Number(slider.value)/100);
  slider.onchange=()=>interfaceAudio.play('click');
  preview.onclick=()=>{interfaceAudio.unlock();interfaceAudio.play('success');};
  document.addEventListener('pointerdown',e=>{if(e.isTrusted)interfaceAudio.unlock();},true);
  document.addEventListener('keydown',e=>{if(e.isTrusted)interfaceAudio.unlock();},true);
  document.addEventListener('click',e=>{
    if(!e.isTrusted)return;
    const button=e.target.closest('button');
    if(button&&!button.disabled&&!button.classList.contains('hud-toggle')&&button!==preview)interfaceAudio.play('click');
  },true);
  // Other expandable controls (bookmarks, availability explanations).
  document.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS')interfaceAudio.play(e.target.open?'open':'close');},true);
}
