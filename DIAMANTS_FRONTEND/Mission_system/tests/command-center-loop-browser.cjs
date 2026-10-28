const assert=require('node:assert/strict'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1440,height:1000});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5552/');
 await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
 await page.evaluate(async()=>{const {TacticalMap}=await import('/command-center/tactical-map.js');const original=TacticalMap.prototype.update;TacticalMap.prototype.update=function(...args){window.testMap=this;return original.apply(this,args);};});
 await page.waitForFunction(()=>window.testMap);
 await page.evaluate(()=>{window.testMap.framing=null;window.testMap.center={x:42,z:-17};window.testMap.zoom=2;window.testMap.draw();});
 for(let i=0;i<3;i++) await page.$$eval('[data-select]',(buttons,i)=>buttons[i].click(),i);
 assert.deepEqual(await page.evaluate(()=>({center:window.testMap.center,zoom:window.testMap.zoom})),{center:{x:42,z:-17},zoom:2});
 await page.$eval('#focus-agent',e=>e.click());assert.equal(await page.evaluate(()=>window.testMap.framing),'agent');
 const before=await page.evaluate(()=>({center:{...window.testMap.center},zoom:window.testMap.zoom}));
 await page.$$eval('[data-select]',buttons=>buttons[0].click());
 assert.deepEqual(await page.evaluate(()=>({center:window.testMap.center,zoom:window.testMap.zoom})),before);
 assert.equal(await page.evaluate(()=>window.testMap.framing),null);
 await page.click('.command-availability summary');
 assert.match(await page.$eval('#availability-return',e=>e.textContent),/Flotte au sol/);
 assert(await page.$eval('[data-command="return"]',e=>e.disabled&&e.getAttribute('aria-describedby').includes('availability-return')));
 await page.$eval('#context-squad',e=>e.click());assert.match(await page.$eval('#squad-availability',e=>e.textContent),/Créez ou sélectionnez/);
 await page.$eval('#squad-members-list input',e=>e.click());await page.type('#squad-name','Test');await page.$eval('#squad-create',e=>e.click());
 assert.match(await page.$eval('#squad-availability',e=>e.textContent),/au moins un ordre/);
 await page.select('#squad-order-type','wait');await page.$eval('#squad-add',e=>e.click());
 assert.match(await page.$eval('#squad-availability',e=>e.textContent),/uniquement 1 drone/);
 for(const width of [1440,390]){await page.setViewport({width,height:1000});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));await page.screenshot({path:`/private/tmp/diamants-loop-${width}.png`,fullPage:true});}
 assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');assert.deepEqual(errors,[]);
 console.log('PASS: selection preserves center/zoom, explicit focus, selection exits follow, fleet/squad explanations, no launch, desktop/mobile');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
