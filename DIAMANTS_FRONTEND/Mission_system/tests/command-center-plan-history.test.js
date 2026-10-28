import {describe,it,expect} from 'vitest';
import {PlanHistory} from '../command-center/plan-history.js';
describe('Draft history',()=>{
 it('restores an entire cleared plan and supports redo',()=>{const h=new PlanHistory(),p=Array.from({length:8},(_,x)=>({x,z:2}));h.record(p,[],'clear');expect(h.move('undo')).toEqual(p);expect(h.move('redo')).toEqual([]);});
 it('isolates snapshots from callers and discards the redo branch after an edit',()=>{const h=new PlanHistory(),p=[{x:1,z:2}];h.record([],p,'add');p[0].x=99;const preview=h.peek('undo');preview.points.push({x:9,z:9});expect(h.move('undo')).toEqual([]);expect(h.peek('redo').points).toEqual([{x:1,z:2}]);h.record([],[{x:3,z:4}],'new');expect(h.peek('redo')).toBeNull();});
 it('bounds memory and does not create no-op entries',()=>{const h=new PlanHistory(2);expect(h.record([],[],'noop')).toBe(false);for(let x=1;x<=3;x++)h.record([{x:x-1,z:0}],[{x,z:0}],String(x));expect(h.move('undo')).toEqual([{x:2,z:0}]);expect(h.move('undo')).toEqual([{x:1,z:0}]);expect(h.move('undo')).toBeNull();h.clear();expect(h.peek('redo')).toBeNull();});
});
