// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {createInterfaceAudio} from '../command-center/interface-audio.js';
it('unlocks only after interaction, limits bursts, mutes and persists volume',()=>{
 let tones=0,time=0,created=0;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Audio {constructor(){created++;this.state='running';this.currentTime=0;}createGain(){return {gain:param(),connect(){},disconnect(){}};}createOscillator(){return {frequency:param(),connect(){},disconnect(){},start(){tones++;},stop(){}};}}
 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const audio=createInterfaceAudio({storage,AudioContextClass:Audio,now:()=>time});
 expect(audio.play('open')).toBe(false);expect(created).toBe(0);audio.unlock();expect(created).toBe(1);
 expect(audio.play('open')).toBe(true);expect(tones).toBe(2);expect(audio.play('close')).toBe(false);
 time=100;expect(audio.play('close')).toBe(true);expect(tones).toBe(4);
 expect(audio.play('warning')).toBe(true);expect(audio.play('success')).toBe(false);expect(audio.play('error')).toBe(true);
 audio.setEnabled(false);time=2000;expect(audio.play('error')).toBe(false);
 audio.setVolume(0.4);const restored=createInterfaceAudio({storage});expect(restored.enabled).toBe(false);expect(restored.volume).toBe(0.4);
 audio.setEnabled(true);audio.setVolume(0);expect(audio.play('click')).toBe(false);
});
it('survives unavailable audio and storage',()=>{const audio=createInterfaceAudio({storage:{getItem(){throw Error();},setItem(){throw Error();}}});audio.unlock();audio.setEnabled(false);audio.setVolume(2);expect(audio.volume).toBe(1);expect(audio.play('error')).toBe(false);});
