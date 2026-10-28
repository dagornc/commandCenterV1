const assert=require('node:assert/strict'),p=require('puppeteer');
(async()=>{const b=await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
 const page=await b.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER',e.message);});await page.setViewport({width:1440,height:1000});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');
 await page.evaluate(()=>localStorage.setItem('diamants.command.plan',JSON.stringify([{x:10,z:10},{x:20,z:20}])));await page.reload();await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
 assert.match(await page.$eval('#mission-summary',e=>e.textContent),/0\/\d+ en vol/);
 await page.$eval('#dock-launch',e=>e.click());await page.waitForSelector('#order-review[open]');assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');assert.equal(await page.$$eval('#order-review ol li',els=>els.length),2);await page.click('#order-review-cancel');
 await page.$eval('#mission-library',e=>e.open=true);await page.$eval('#template-save-plan',e=>e.click());assert.equal(await page.$$eval('#template-select option',els=>els.length),1);
 await page.$eval('#template-scale',e=>e.value=10);await page.$eval('#template-load',e=>e.click());assert.match(await page.$eval('#template-status',e=>e.textContent),/hors zone/);
 await page.$eval('#template-scale',e=>e.value=2);await page.$eval('#template-load',e=>e.click());assert.match(await page.$eval('#plan-targets',e=>e.textContent),/40/);
 await page.$eval('#layout-width-left',e=>{e.value=380;e.dispatchEvent(new Event('input'));});await page.$eval('#layout-save',e=>e.click());await page.$eval('#layout-width-left',e=>{e.value=240;e.dispatchEvent(new Event('input'));});await page.$eval('#layout-load',e=>e.click());assert.equal(await page.$eval('#layout-width-left',e=>e.value),'380');
 // Mini-map changes only the camera.
 await page.$eval('#overview-canvas',e=>e.focus());await page.keyboard.press('ArrowRight');assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');
 const id=await page.evaluate(()=>{const d=[...document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine.drones.values()][0];d.battery=18;return d.id;});await page.waitForFunction(()=>document.querySelector('#mission-summary').textContent.includes('1 alerte'));
 await page.evaluate(id=>document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine.drones.get(id).battery=9,id);await page.waitForFunction(()=>document.querySelector('#mission-summary').classList.contains('critical'));
 await page.focus('#overview-canvas');for(let i=0;i<35;i++)await page.keyboard.press('ArrowRight');await page.waitForSelector('.edge-alert');await page.click('.edge-alert');
 await page.evaluate(id=>delete document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine.drones.get(id).battery,id);
 await page.$eval('#replay-open',e=>e.click());await page.waitForSelector('#mission-replay[open]');assert.match(await page.$eval('#replay-state',e=>e.textContent),/Couverture/);await page.click('#replay-close');
 // Context action stages a scoped return without transmitting it.
 await page.$eval('.selection-actions [data-action=return]',e=>e.click());
 assert.equal(await page.$$eval('#squad-orders li',els=>els.length),1);
 await page.$eval('#template-save-orders',e=>e.click());assert.equal(await page.$$eval('#template-select option',els=>els.length),2);
 await page.$eval('#squad-run',e=>e.click());await page.waitForSelector('#order-review[open]');assert.match(await page.$eval('#order-review-scope',e=>e.textContent),/^1 agent/);assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');await page.click('#order-review-cancel');
 await page.$eval('#dock-launch',e=>e.click());await page.waitForSelector('#order-review[open]');await page.click('#order-review-confirm');await page.waitForFunction(()=>document.querySelector('#metric-airborne').textContent!=='00',{timeout:15000});
 await page.screenshot({path:'/private/tmp/diamants-decisions-desktop.png'});
 await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.emergencyLand());
 await page.setViewport({width:390,height:844});if(await page.$eval('#hud-toggle-right',e=>e.getAttribute('aria-expanded')==='true'))await page.click('#hud-toggle-right');assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));await page.screenshot({path:'/private/tmp/diamants-decisions-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS summary, staged orders, template transform/bounds, saved layout width, minimap, escalation, replay, mobile, no JS errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
