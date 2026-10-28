const assert=require('node:assert/strict'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.setViewport({width:1440,height:1000});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5552/');
await page.waitForSelector('#map-lens');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
const layers=()=>page.$$eval('[data-layer]',bs=>Object.fromEntries(bs.map(b=>[b.dataset.layer,b.getAttribute('aria-pressed')==='true'])));
await page.select('#map-lens','coordination');assert.deepEqual(await layers(),{trails:false,links:true,coverage:false});
await page.reload();await page.waitForSelector('#map-lens');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});assert.equal(await page.$eval('#map-lens',e=>e.value),'coordination');
await page.$eval('[data-layer=coverage]',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click('[data-layer=coverage]');await page.waitForFunction(()=>document.querySelector('#map-lens').value==='custom');
await page.select('#map-lens','movement');assert.deepEqual(await layers(),{trails:true,links:false,coverage:false});
await page.setViewport({width:390,height:1000});await page.select('#map-lens','exploration');assert.deepEqual(await layers(),{trails:false,links:false,coverage:true});
assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));
assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');
await page.screenshot({path:'/private/tmp/diamants-lenses-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
console.log('PASS: three presets, reload persistence, manual customization, mobile, no launch, no browser errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
