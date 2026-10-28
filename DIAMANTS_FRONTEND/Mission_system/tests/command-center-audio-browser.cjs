const assert=require('node:assert/strict'),p=require('puppeteer');
(async()=>{const browser=await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
 await page.evaluateOnNewDocument(()=>{window.__tones=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(...args){window.__tones++;return original.apply(this,args);};});
 await page.goto('http://127.0.0.1:5552/');await page.waitForSelector('#interface-sounds');assert.equal(await page.evaluate(()=>window.__tones),0);
 await page.click('#hud-toggle-left');await page.waitForFunction(()=>window.__tones>=2);
 await page.click('#settings-button');await page.waitForSelector('#settings-dialog[open]');
 await page.click('#interface-sounds');assert(await page.$eval('#interface-volume',e=>e.disabled));const muted=await page.evaluate(()=>window.__tones);
 await page.click('#settings-dialog [aria-label=Fermer]');await page.click('#hud-toggle-right');assert.equal(await page.evaluate(()=>window.__tones),muted);
 await page.reload();await page.waitForSelector('#interface-sounds');assert.equal(await page.$eval('#interface-sounds',e=>e.checked),false);assert.equal(await page.evaluate(()=>window.__tones),0);
 await page.click('#settings-button');await page.click('#interface-sounds');await page.$eval('#interface-volume',e=>{e.value=40;e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.click('#interface-sound-test');await page.waitForFunction(()=>window.__tones>0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('diamants.command.audio')).volume),0.4);
 assert.deepEqual(errors,[]);console.log('PASS audio gesture, panel tones, mute, persistence, volume, preview, no JS errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
