const assert=require('node:assert/strict'),p=require('puppeteer');
(async()=>{const browser=await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:900});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
 await page.click('#hud-tab-layout');await page.click('#layout-pin-left');assert.equal(await page.$eval('#hud-left',e=>e.dataset.mode),'preview','checkbox immediately updates geometry');
 await page.click('#hud-pin-left');await page.click('#hud-toggle-top');await page.click('#hud-pin-top');await page.click('#hud-toggle-bottom');await page.click('#hud-pin-bottom');assert(await page.$eval('.map-panel',e=>e.getBoundingClientRect().height)>=300,'two pinned horizontal panels preserve 300px scene');
 await page.setViewport({width:1440,height:600});await new Promise(r=>setTimeout(r,200));assert(await page.$eval('.map-panel',e=>e.getBoundingClientRect().height)>=240,'short desktop keeps usable scene');
 await page.setViewport({width:390,height:844});await new Promise(r=>setTimeout(r,200));assert.equal(await page.$$eval('.hud-panel:not([hidden])',e=>e.length),1,'shrinking to mobile keeps only one panel');
 await page.keyboard.press('Escape');assert.equal(await page.$$eval('.hud-panel:not([hidden])',e=>e.length),0,'Escape closes mobile drawer even with desktop pin preference');
 await page.click('#hud-tab-layout');await page.select('#layout-profile','analyse');await page.click('#layout-load');assert.equal(await page.$$eval('.hud-panel:not([hidden])',e=>e.length),1,'profile keeps mobile single-panel rule');
 assert.deepEqual(errors,[]);console.log('PASS pin checkbox, short desktop scene, mobile resize, mobile Escape, mobile profiles, no JS errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
