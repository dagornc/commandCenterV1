import {describe,it,expect,vi} from 'vitest';
import {SquadOrders} from '../command-center/squad-orders.js';
const point=(x=0,z=0)=>({x,z,clone(){return point(this.x,this.z);}});
function setup(){
 const drones=new Map(['a','b','c'].map(id=>[id,{id,phase:'IDLE',position:point()}]));
 const engine={drones,takeoff:vi.fn(id=>{drones.get(id).phase='TAKEOFF';}),returnToHome:vi.fn(id=>{drones.get(id)._returningToBase=true;})};
 const c={autonomousFlightEngine:engine,isRunning:false,missionStarted:false};return {r:new SquadOrders(c),c,engine,drones};
}
const group={id:'1',name:'Nord',ids:['a'],orders:[{type:'move',x:10,z:10},{type:'wait',seconds:2},{type:'return'}]};
const bounds={x:60,z:60};
describe('Scoped squad orders',()=>{
 it('executes ordered movement, wait and return only for assigned drones',()=>{
  const {r,engine,drones}=setup();r.start(group,bounds);
  expect(engine.takeoff.mock.calls).toEqual([['a']]);
  const a=drones.get('a');a.phase='HOVER';r.tick(0);
  expect(a.phase).toBe('EXPLORE');expect(engine.missionWaypointProvider('a',a)).toMatchObject({x:10,z:10});
  expect(engine.missionWaypointProvider('b',drones.get('b'))).toBeNull();
  a.position=point(10,10);r.tick(10);r.tick(20);expect(a.phase).toBe('HOVER');
  r.tick(2019);expect(engine.returnToHome).not.toHaveBeenCalled();r.tick(2020);r.tick(2021);
  expect(engine.returnToHome.mock.calls).toEqual([['a']]);a.phase='LANDED';r.tick(2022);expect(r.jobs.get('1').status).toBe('done');expect(drones.get('b').phase).toBe('IDLE');
 });
 it('rejects overlapping active groups and out of bounds targets before takeoff',()=>{
  const {r,engine}=setup();expect(()=>r.start({...group,orders:[{type:'move',x:100,z:0}]},bounds)).toThrow();expect(engine.takeoff).not.toHaveBeenCalled();
  r.start(group,bounds);expect(()=>r.start({...group,id:'2'},bounds)).toThrow(/déjà affecté/);
 });
 it('does not resume a queue after global stop or a changed provider',()=>{
  const {r,c,drones}=setup();r.start(group,bounds);c.missionStarted=false;r.tick(0);c.missionStarted=true;drones.get('a').phase='HOVER';r.tick(9000);expect(r.jobs.get('1').status).toBe('cancelled');expect(drones.get('a').phase).toBe('HOVER');
 });
 it('allows independent simultaneous squads and preserves fallback provider',()=>{
  const {r,engine,drones}=setup();engine.missionWaypointProvider=()=>({x:1,z:2});r.start(group,bounds);r.start({...group,id:'2',ids:['b'],orders:[{type:'move',x:-10,z:-10}]},bounds);
  expect(engine.missionWaypointProvider('b',drones.get('b')).x).toBe(-10);expect(engine.missionWaypointProvider('c',drones.get('c')).x).toBe(1);
 });
 it('does not override a new navigation provider when relinquishing the queue',()=>{
  const {r,engine,drones}=setup();r.start(group,bounds);drones.get('a').phase='HOVER';r.tick(0);
  engine.missionWaypointProvider=()=>({x:-20,z:0});
  r.tick(500);
  expect(r.jobs.get('1').status).toBe('cancelled');
  expect(drones.get('a').phase).toBe('EXPLORE');
 });
 it('cancels only the chosen squad while another continues',()=>{
  const {r,drones}=setup();r.start(group,bounds);r.start({...group,id:'2',ids:['b']},bounds);
  drones.get('a').phase='HOVER';drones.get('b').phase='HOVER';r.tick(0);r.cancel('1');r.tick(500);
  expect(drones.get('a').phase).toBe('HOVER');expect(drones.get('b').phase).toBe('EXPLORE');expect(r.jobs.get('2').status).toBe('running');
 });

});
