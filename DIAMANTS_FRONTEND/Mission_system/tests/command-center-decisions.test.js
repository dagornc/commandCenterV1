// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {ReplayBuffer,edgePosition} from '../command-center/decision-workspace.js';
import {validTemplate,transformTemplate} from '../command-center/mission-library.js';
it('records detached bounded samples, excludes offline samples and locates event time',()=>{
 const r=new ReplayBuffer(2),s={ready:true,halfBounds:{x:60,z:60},coverage:10,started:true,drones:[{id:'a',name:'A',phase:'HOVER',position:{x:1,z:2}}]};
 r.capture(s,0);s.drones[0].position.x=99;expect(r.frames[0].drones[0].position.x).toBe(1);
 r.capture(s,500);expect(r.frames).toHaveLength(1);r.capture({...s,ready:false},2000);expect(r.frames).toHaveLength(1);
 r.capture(s,3000);r.capture(s,4000);expect(r.frames.map(f=>f.at)).toEqual([3000,4000]);expect(r.nearest(3900)).toBe(1);
});
it('projects offscreen markers to bounded screen edges',()=>{expect(edgePosition({x:1000,y:100},400,200,20)).toMatchObject({x:380,y:100});const p=edgePosition({x:-900,y:-900},300,200,20);expect(p.x).toBeGreaterThanOrEqual(20);expect(p.y).toBeGreaterThanOrEqual(20);});
it('validates reusable templates and transformed targets without launching',()=>{
 const plan={kind:'plan',name:'Scan',items:[{x:10,z:20}]};expect(transformTemplate(plan,2,1,-1,{x:50,z:50})).toEqual([{x:21,z:39}]);expect(()=>transformTemplate(plan,10,0,0,{x:50,z:50})).toThrow(/hors zone/);
 expect(validTemplate({kind:'orders',name:'Bad',items:[{type:'return'},{type:'wait',seconds:5}]})).toBe(false);
 expect(validTemplate({kind:'orders',name:'Bad',items:[{type:'wait',seconds:Infinity}]})).toBe(false);
 expect(validTemplate({kind:'orders',name:'Good',items:[{type:'move',x:0,z:0},{type:'wait',seconds:5},{type:'return'}]})).toBe(true);
});
