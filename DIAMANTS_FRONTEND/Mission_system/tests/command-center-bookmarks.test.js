// @vitest-environment jsdom
import {describe, it, expect, vi} from 'vitest';
import {CAMERA_BOOKMARKS_KEY, validateCameraBookmarks, readCameraBookmarks, initCameraBookmarks} from '../command-center/camera-bookmarks.js';
const view = () => ({id:'north',name:'Nord',center:{x:30,z:-40},zoom:1.5,layers:{trails:true,links:false,coverage:true}});
function storage(initial = null) {
  let value = initial;
  return {getItem:vi.fn(()=>value),setItem:vi.fn((key,next)=>{value=next;})};
}
function mount(store = storage()) {
  document.body.replaceChildren();
  const map = {framing:'fleet',center:{x:30,z:-40},zoom:1.5,layers:{trails:true,links:false,coverage:true},draw:vi.fn()};
  const notify=vi.fn(),onRecall=vi.fn();
  const api=initCameraBookmarks({map,container:document.body,storage:store,notify,onRecall});
  return {map,notify,onRecall,api,store};
}
describe('camera bookmarks', () => {
  it('rejects corrupt, duplicate, oversized and out of bounds data', () => {
    expect(readCameraBookmarks(storage('{')).status).toBe('corrupt');
    expect(validateCameraBookmarks([view(),view()])).toBeNull();
    expect(validateCameraBookmarks(Array.from({length:7},(_,i)=>({...view(),id:String(i)})))).toBeNull();
    for (const bad of [{...view(),zoom:NaN},{...view(),zoom:10},{...view(),center:{x:100001,z:0}},{...view(),layers:{trails:1,links:false,coverage:true}}]) expect(validateCameraBookmarks([bad])).toBeNull();
  });
  it('clones allowlisted view state without mutable aliases', () => {
    const original=view();original.command='launch';
    const [copy]=validateCameraBookmarks([original]); original.center.x=90;original.layers.trails=false;
    expect(copy.center.x).toBe(30);expect(copy.layers.trails).toBe(true);expect(copy.command).toBeUndefined();
  });
  it('persists and restores views without moving the camera on load', () => {
    const first=mount();document.getElementById('view-name').value='Secteur nord';document.getElementById('view-save').click();
    first.map.center.x=999;
    expect(JSON.parse(first.store.getItem(CAMERA_BOOKMARKS_KEY))[0].center.x).toBe(30);
    const next=mount(first.store);expect(next.onRecall).not.toHaveBeenCalled();expect(next.map.draw).not.toHaveBeenCalled();
    next.map.center={x:100,z:100};document.querySelector('.view-recall').click();
    expect(next.map.center).toEqual({x:30,z:-40});expect(next.map.framing).toBeNull();expect(next.map.zoom).toBe(1.5);expect(next.onRecall).toHaveBeenCalledOnce();
    next.map.center.x=200;expect(next.api.getBookmarks()[0].center.x).toBe(30);
  });
  it('keeps usable session bookmarks when local storage is denied', () => {
    const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
    const {api,notify}=mount(denied);document.getElementById('view-save').click();
    expect(api.getBookmarks()).toHaveLength(1);expect(notify).toHaveBeenCalled();expect(document.getElementById('view-storage-status').textContent).toContain('session');
    document.querySelector('.view-recall').click();expect(api.getBookmarks()).toHaveLength(1);
  });
  it('bounds the list at six and persists deletion', () => {
    const {api,store}=mount();for(let i=0;i<7;i++) document.getElementById('view-save').click();
    expect(api.getBookmarks()).toHaveLength(6);expect(document.getElementById('view-save').disabled).toBe(true);
    document.querySelector('.view-remove').click();expect(api.getBookmarks()).toHaveLength(5);expect(document.getElementById('view-save').disabled).toBe(false);
    expect(readCameraBookmarks(store).bookmarks).toHaveLength(5);
  });
  it('renders untrusted names as text and handles empty names', () => {
    const {api}=mount();document.getElementById('view-name').value='<img src=x onerror=alert(1)>';document.getElementById('view-save').click();
    expect(document.querySelector('img')).toBeNull();expect(document.querySelector('.view-recall').textContent).toContain('<img');
    document.getElementById('view-save').click();expect(api.getBookmarks()[1].name).toBe('Vue 2');
  });
  it('does not reuse an existing identifier after a reload in the same millisecond', () => {
    const clock=vi.spyOn(Date,'now').mockReturnValue(123);
    try {
      const {api}=mount(storage(JSON.stringify([{...view(),id:'view-123-1'}])));
      document.getElementById('view-save').click();
      expect(new Set(api.getBookmarks().map(v=>v.id)).size).toBe(2);
      expect(validateCameraBookmarks(api.getBookmarks())).not.toBeNull();
    } finally {clock.mockRestore();}
  });

});
