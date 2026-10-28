import {describe,it,expect} from 'vitest';
import {orderProgress,copyOrders} from '../command-center/order-progress.js';
const orders=[{type:'move',x:10,z:10},{type:'wait',seconds:10},{type:'return'}];
const job={orders,index:0,status:'running',ids:['a','b'],entered:true,since:1000};
const engine={drones:new Map([['a',{phase:'EXPLORE',position:{x:10,z:10}}],['b',{phase:'EXPLORE',position:{x:30,z:10}}]])};
describe('Observed order progress',()=>{
 it('counts only drones actually within arrival distance',()=>{const p=orderProgress(job,engine,2000);expect(p.text).toContain('1/2');expect(p.rows).toEqual(['active','pending','pending']);expect(p.target).toMatchObject({x:10,z:10,step:1});});
 it('shows elapsed wait countdown rather than travel ETA',()=>{const p=orderProgress({...job,index:1},engine,4500);expect(p.text).toContain('7 s restantes');expect(p.target).toBeNull();});
 it('distinguishes completed steps from cancelled remaining steps',()=>{expect(orderProgress({...job,index:1,status:'cancelled'},engine).rows).toEqual(['done','cancelled','cancelled']);expect(orderProgress({...job,index:3,status:'done'},engine).rows).toEqual(['done','done','done']);});
 it('copies orders independently, appends, and respects the size limit',()=>{const copied=copyOrders(orders,[{type:'wait',seconds:1}]);copied[1].x=55;expect(orders[0].x).toBe(10);expect(copied).toHaveLength(4);expect(()=>copyOrders(orders,[],2)).toThrow();expect(()=>copyOrders([],[])).toThrow();});
});
