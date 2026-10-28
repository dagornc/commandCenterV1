const assert=require('node:assert/strict'),p=require('puppeteer');
(async()=>{const browser=await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});await page.setViewport({width:1440,height:1000});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
 await page.evaluate(()=>window.hudFrame=document.querySelector('#simulation-frame').contentWindow);
 assert(await page.$eval('#hud-top',e=>e.contains(document.querySelector('.attention-center'))));
 assert(await page.$eval('#hud-bottom',e=>e.contains(document.querySelector('#squad-orders'))));
 await page.type('#fleet-search','CF');await page.click('#hud-tab-library');await page.click('#hud-tab-fleet');assert.equal(await page.$eval('#fleet-search',e=>e.value),'CF');
 const mapWidth=()=>page.$eval('.map-panel',e=>e.getBoundingClientRect().width);
 const pinnedWidth=await mapWidth();await page.click('#hud-pin-left');assert.equal(await page.$eval('#hud-left',e=>e.dataset.mode),'preview');assert(await mapWidth()>pinnedWidth+200);
 await page.click('#hud-toggle-left');const collapsedWidth=await mapWidth();await page.click('#hud-tab-library');assert.equal(await mapWidth(),collapsedWidth);
 await page.keyboard.press('Escape');assert(await page.$eval('#hud-left',e=>e.hidden));await page.click('#hud-tab-fleet');await page.click('#hud-pin-left');
 await page.focus('.hud-resize-left');const before=await page.$eval('#layout-width-left',e=>Number(e.value));await page.keyboard.press('ArrowRight');assert.equal(await page.$eval('#layout-width-left',e=>Number(e.value)),before+10);
 const r=await page.$eval('.hud-resize-left',e=>e.getBoundingClientRect().toJSON());await page.mouse.move(r.x+4,r.y+30);await page.mouse.down();await page.mouse.move(r.x+44,r.y+30,{steps:4});await page.mouse.up();assert(await page.$eval('#layout-width-left',e=>Number(e.value))>=before+40);
 await page.click('#hud-toggle-top');await page.click('#hud-tab-alerts');assert.equal(await page.$eval('#hud-pane-alerts',e=>e.hidden),false);
 await page.click('#hud-toggle-bottom');assert(await page.$eval('#hud-top',e=>e.hidden));await page.click('#hud-tab-orders');await page.click('#hud-tab-replay');assert.equal(await page.$eval('#hud-pane-replay',e=>e.hidden),false);
 assert.equal(await page.evaluate(()=>window.hudFrame===document.querySelector('#simulation-frame').contentWindow),true);assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');
 // Search must reveal the correct previously hidden tab.
 await page.keyboard.press('o');await page.type('#navigation-query','bibliothèque');await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('#hud-pane-library').hidden);
 await page.keyboard.press('o');await page.type('#navigation-query','preferences');await page.keyboard.press('Enter');await page.select('#hud-density','compact');assert.equal(await page.evaluate(()=>document.body.dataset.density),'compact');assert.equal(await page.evaluate(()=>localStorage.getItem('diamants.command.density')),'compact');await page.select('#hud-density','comfortable');await page.keyboard.press('Escape');
 await page.screenshot({path:'/private/tmp/diamants-hud2-desktop.png'});
 await page.setViewport({width:390,height:844});await page.click('#hud-tab-fleet');await page.click('.hud-context-tab[aria-label="Drone"]');assert(await page.$eval('#hud-left',e=>e.hidden));await page.click('#hud-toggle-right');
 assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));await page.screenshot({path:'/private/tmp/diamants-hud2-mobile.png'});assert.deepEqual(errors,[]);console.log('PASS semantic tabs, values preserved, preview/pin/collapse geometry, Escape, keyboard/pointer resize, search reveal, same iframe, mobile, no launch/errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
