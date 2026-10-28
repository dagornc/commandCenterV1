const assert=require('node:assert/strict'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
// Puppeteer does not account for fixed overlays when it considers an element visible.
const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector);};
await page.evaluate(()=>window.__engine=document.querySelector('#simulation-frame').contentWindow.diamantsSystem.integratedController.autonomousFlightEngine);
assert(await page.$eval('[aria-labelledby="squads-title"]',e=>e.hidden));
await page.$eval('#zone-width',e=>{e.value='240';e.dispatchEvent(new Event('input',{bubbles:true}));});
await click('#workspace-supervise');assert(await page.$eval('[aria-labelledby="plan-title"]',e=>e.hidden));assert(!(await page.$eval('#agent-inspector',e=>e.hidden)));
await click('#workspace-prepare');assert.equal(await page.$eval('#zone-width',e=>e.value),'240');
await click('#context-squad');await page.select('#squad-order-type','wait');assert(await page.$eval('#squad-x',e=>e.closest('label').hidden));assert(!(await page.$eval('#squad-seconds',e=>e.closest('label').hidden)));
await page.select('#squad-order-type','return');assert(await page.$eval('#squad-seconds',e=>e.closest('label').hidden));
await page.select('#squad-order-type','move');await click('#squad-pick-target');const p=await page.$eval('#tactical-map',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2+35,y:r.y+r.height/2+25};});await page.mouse.click(p.x,p.y);assert(Number(await page.$eval('#squad-x',e=>e.value))>0);assert.match(await page.$eval('#squad-pick-status',e=>e.textContent),/Cible choisie/);
await page.$eval('#squad-members-list input',e=>e.click());await click('#squad-create');await click('#squad-add');assert.equal(await page.$$eval('#squad-orders li',e=>e.length),1);
await page.$eval('[data-agent]',e=>e.click());assert(!(await page.$eval('#agent-inspector',e=>e.hidden)));await click('#context-squad');assert.equal(await page.$$eval('#squad-orders li',e=>e.length),1);
assert(await page.evaluate(()=>window.__engine===document.querySelector('#simulation-frame').contentWindow.diamantsSystem.integratedController.autonomousFlightEngine));
await page.$eval('.operations-grid',e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:'/private/tmp/diamants-workspace-desktop.png'});
for(const width of [768,390]){await page.setViewport({width,height:900});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));await click('#workspace-supervise');await click('#context-squad');await page.screenshot({path:`/private/tmp/diamants-workspace-${width}.png`});}
await click('#squad-pick-target');await click('#workspace-prepare');await click('#context-squad');assert.equal(await page.$eval('#squad-pick-target',e=>e.getAttribute('aria-pressed')),'false');
await page.setViewport({width:1440,height:1000});await click('#context-zone');await click('#plan-point');assert.equal(await page.$eval('#plan-point',e=>e.getAttribute('aria-pressed')),'true');await click('#workspace-supervise');assert.equal(await page.$eval('#plan-point',e=>e.getAttribute('aria-pressed')),'false');await page.$eval('#map-stage',e=>e.scrollIntoView({block:'center'}));
const q=await page.$eval('#tactical-map',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2+35,y:r.y+r.height/2+25};});await page.mouse.click(q.x,q.y);
assert.equal(await page.$$eval('#plan-targets li',e=>e.length),0,'supervision must cancel hidden planning tools');
assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00','navigation must not trigger flight commands');
assert.deepEqual(errors,[]);console.log('PASS: workspace modes, preserved draft/queue/engine, contextual inspector, conditional fields, map target picking, desktop/tablet/mobile');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
