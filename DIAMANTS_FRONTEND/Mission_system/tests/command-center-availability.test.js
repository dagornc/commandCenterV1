import {describe,it,expect} from 'vitest';
import {fleetCommandReason} from '../command-center/command-availability.js';
const ground={ready:true,started:false,running:false,drones:[{phase:'IDLE'}]};
describe('Fleet command explanations',()=>{
 it('blocks every command before the engine is ready',()=>{
  for(const command of ['launch','takeoff','land','return','stop']) expect(fleetCommandReason(command,{...ground,ready:false},false,0)).toMatch(/Moteur/);
 });
 it('allows launch and takeoff on ground but explains no-op recovery commands',()=>{
  for(const command of ['launch','takeoff']) expect(fleetCommandReason(command,ground,false,0)).toBe('');
  for(const command of ['land','return','stop']) expect(fleetCommandReason(command,ground,false,0)).toMatch(/Flotte au sol/);
 });
 it('keeps recovery available in flight and distinguishes launch blockers',()=>{
  const flying={...ground,started:true,running:true,drones:[{phase:'EXPLORE'}]};
  expect(fleetCommandReason('launch',flying,false,1)).toMatch(/déjà en cours/);
  expect(fleetCommandReason('launch',flying,true,1)).toMatch(/Retour en cours/);
  expect(fleetCommandReason('takeoff',flying,false,1)).toMatch(/déjà en vol/);
  for(const command of ['land','return','stop']) expect(fleetCommandReason(command,flying,false,1)).toBe('');
 });
});
