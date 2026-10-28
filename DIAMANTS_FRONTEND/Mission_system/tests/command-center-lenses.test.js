// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { initMapLenses, matchingLens } from '../command-center/map-lenses.js';
describe('map reading presets', () => {
  it('preserves camera and mission, synchronizes manual layers and saved recalls', async () => {
    document.body.innerHTML = '<div class="map-stage"></div>' + ['trails','links','coverage'].map(k=>`<button data-layer="${k}" aria-pressed="false"></button>`).join('');
    const map = {layers:{trails:true,links:false,coverage:true},center:{x:15,z:24},zoom:3,selected:7,draw(){}};
    let saves=0;
    const dispose=initMapLenses({map,onChange:()=>saves++,onTactical:()=>{}});
    const select=document.querySelector('select');
    expect(select.value).toBe('custom');
    select.value='coordination';select.dispatchEvent(new Event('change'));
    expect(map.layers).toEqual({trails:false,links:true,coverage:false});
    expect(map.center).toEqual({x:15,z:24});expect(map.zoom).toBe(3);expect(map.selected).toBe(7);expect(saves).toBe(1);
    expect(document.querySelector('[role=status]').textContent).toContain('ne sont pas des liaisons radio');
    map.layers.coverage=true;document.querySelector('[data-layer=coverage]').setAttribute('aria-pressed','true');
    await Promise.resolve();expect(select.value).toBe('custom');
    map.layers={trails:false,links:false,coverage:true};document.querySelector('[data-layer=links]').setAttribute('aria-pressed','false');
    await Promise.resolve();expect(select.value).toBe('exploration');
    dispose();expect(document.querySelector('select')).toBeNull();
  });
  it('recognizes only exact presets',()=>{
    expect(matchingLens({trails:true,links:true,coverage:true})).toBe('custom');
    expect(matchingLens({trails:true,links:false,coverage:false})).toBe('movement');
  });
});
