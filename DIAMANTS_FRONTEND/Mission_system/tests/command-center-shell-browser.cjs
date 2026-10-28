const assert=require('node:assert/strict'),p=require('puppeteer');
(async()=>{const b=await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});await page.goto('http://127.0.0.1:5552/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
await page.evaluate(()=>document.querySelector('iframe').contentWindow.__hudTest='unchanged');
for(const side of ['left','right','top','bottom']){await page.click('#hud-toggle-'+side);await page.click('#hud-toggle-'+side);}
assert.equal(await page.evaluate(()=>document.querySelector('iframe').contentWindow.__hudTest),'unchanged');
const bounds=await page.$eval('.map-panel',e=>e.getBoundingClientRect().toJSON());assert(bounds.width>650);assert(bounds.height>650);
await page.screenshot({path:'/private/tmp/diamants-shell-desktop.png'});
await page.click('#hud-toggle-right');await page.keyboard.press('g');await page.waitForFunction(()=>!document.querySelector('#hud-right').hidden);
await page.setViewport({width:390,height:844});
await page.click('#hud-toggle-left');assert(await page.$eval('#hud-right',e=>e.hidden));
await page.click('#hud-toggle-right');assert(await page.$eval('#hud-left',e=>e.hidden));
await page.click('#hud-toggle-right');
assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));
await page.screenshot({path:'/private/tmp/diamants-shell-mobile.png'});
assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');assert.deepEqual(errors,[]);console.log('PASS fixed edges, folds, keyboard reveal, iframe preserved, mobile exclusive drawers, no launch/errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
