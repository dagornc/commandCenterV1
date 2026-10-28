import { describe, it, expect } from 'vitest';
import { TacticalMap } from '../command-center/tactical-map.js';
describe('Exploration zone navigation', () => {
  it('zooms out progressively after fitting a very large zone', () => {
    const map = Object.create(TacticalMap.prototype);
    Object.assign(map, {width:800,height:500,snapshot:{halfBounds:{x:5000,z:5000}},draw(){}});
    map.fitBounds();
    const before = map.zoom;
    map.changeZoom(1/1.12);
    expect(map.zoom).toBeLessThan(before);
  });
  it('distinguishes lateral edges from corners and empty map space', () => {
    const map = Object.create(TacticalMap.prototype);
    Object.assign(map,{width:800,height:500,zoom:1,center:{x:0,z:0},snapshot:{halfBounds:{x:60,z:40}}});
    const right = map.project(60,0), corner = map.project(60,40);
    expect(map.boundsHandle(right.x,right.y)).toEqual({x:true,z:false});
    expect(map.boundsHandle(corner.x,corner.y)).toEqual({x:true,z:true});
    expect(map.boundsHandle(400,250)).toBeNull();
  });
});
