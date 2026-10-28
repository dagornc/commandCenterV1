const assert=require('node:assert/strict'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
 await page.click('#camera-bookmarks summary');await page.type('#view-name','Secteur nord');await page.click('[data-layer="links"]');await page.click('#view-save');assert.equal(await page.$$eval('#view-bookmarks li',e=>e.length),1);
 await page.click('[data-layer="links"]');await page.click('.view-recall');assert.equal(await page.$eval('[data-layer="links"]',e=>e.getAttribute('aria-pressed')),'true');
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});assert.equal(await page.$$eval('#view-bookmarks li',e=>e.length),1);assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');
 await page.click('#context-squad');await page.$eval('#squad-members-list input',e=>e.click());await page.type('#squad-name','Nord');await page.click('#squad-create');
 await page.select('#squad-order-type','wait');await page.$eval('#squad-seconds',e=>e.value='2');await page.click('#squad-add');
 await page.$eval('#squad-name',e=>e.value='Sud');await page.click('#squad-create');await page.click('#squad-copy-orders');assert.equal(await page.$$eval('#squad-orders li',e=>e.length),1);
 await page.click('[aria-label="Supprimer l’ordre 1"]');await page.select('#squad-groups','1');assert.equal(await page.$$eval('#squad-orders li',e=>e.length),1,'copy must remain independent');
 await page.click('#squad-run');await page.waitForSelector('#order-review[open]');await page.click('#order-review-confirm');await page.waitForSelector('#squad-orders li[data-state="active"]');assert.match(await page.$eval('#squad-status',e=>e.textContent),/Décollage|Attente/);
 await page.waitForFunction(()=>document.querySelector('#squad-status').textContent.startsWith('Terminé'),{timeout:60000});assert.equal(await page.$$eval('#squad-orders li[data-state="done"]',e=>e.length),1);
 await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.emergencyLand());
 await page.setViewport({width:390,height:900});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));await page.screenshot({path:'/private/tmp/diamants-strategy-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: bookmark save/recall/reload, no automatic launch, independent copied orders, live statuses, mobile, no page errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
