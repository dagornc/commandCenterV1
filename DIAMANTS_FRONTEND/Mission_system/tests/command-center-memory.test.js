import {describe,it,expect} from 'vitest';
import {readStored,validPlan,validReports,MissionRecorder} from '../command-center/session-memory.js';
const sample=(phase,extra={})=>({ready:true,started:false,coverage:12,drones:[{phase}],...extra});
describe('local session memory',()=>{
 it('handles denied storage and invalid plans',()=>{expect(readStored({getItem(){throw Error();}},'x',[])).toEqual([]);expect(validPlan([{x:NaN,z:1}])).toEqual([]);expect(validPlan({})).toEqual([]);expect(validPlan([{x:1,z:2}])).toEqual([{x:1,z:2}]);});
 it('waits for landed phases rather than low altitude',()=>{const r=new MissionRecorder();expect(r.update(sample('IDLE'),0)).toBeNull();r.update(sample('TAKEOFF'),100);expect(r.update(sample('LAND'),500)).toBeNull();expect(r.update(sample('LANDED'),900)).toMatchObject({durationMs:800,coverage:12,agents:1});expect(r.update(sample('LANDED'),1000)).toBeNull();});
 it('marks missing telemetry without premature completion',()=>{const r=new MissionRecorder();r.update(sample('EXPLORE'),0);expect(r.update({ready:false},100)).toBeNull();expect(r.update(sample('LANDED'),200)).toMatchObject({interrupted:true,durationMs:200});});
 it('does not fabricate a report after reset',()=>{const r=new MissionRecorder();r.update(sample('EXPLORE'),1);r.reset();expect(r.update(sample('IDLE'),10)).toBeNull();expect(validReports([{endedAt:'invalid'}])).toEqual([]);});
});
