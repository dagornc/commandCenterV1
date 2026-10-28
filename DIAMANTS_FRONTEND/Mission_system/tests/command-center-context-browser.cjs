const assert=require('node:assert/strict'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1440,height:1000});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5552/');
 await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
 assert.match(await page.$eval('#tactical-status-s',e=>e.textContent),/0 en vol/);
 assert.match(await page.$eval('#agent-action-scope',e=>e.textContent),/uniquement/);
 await page.$eval('[data-select]',e=>e.click());
 assert.match(await page.$eval('#agent-action-scope',e=>e.textContent),/uniquement/);
 assert.equal(await page.$eval('#agent-center',e=>e.disabled),false);
 await page.$eval('#agent-center',e=>e.click());
 await page.waitForFunction(()=>document.querySelector('#focus-agent').getAttribute('aria-pressed')==='true');
 assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');
 const id=await page.evaluate(()=>{const engine=document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine;const d=[...engine.drones.values()][0];d.battery=9;return d.id;});
 await page.waitForFunction(()=>document.querySelector('#tactical-status-a').textContent.includes('1 critique'));
 await page.evaluate(id=>{delete document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine.drones.get(id).battery;},id);
 await page.waitForFunction(()=>document.querySelector('#tactical-status-a').textContent==='0 à examiner');
 await page.$eval('#context-squad',e=>e.click());await page.$eval('#squad-members-list input',e=>e.click());
 await page.type('#squad-name','Contexte');await page.$eval('#squad-create',e=>e.click());
 await page.waitForFunction(()=>document.querySelector('#tactical-status-g').textContent==='0 actif(s) / 1 groupe(s)');
 await page.select('#squad-order-type','wait');await page.$eval('#squad-seconds',e=>e.value='60');await page.$eval('#squad-add',e=>e.click());await page.$eval('#squad-run',e=>e.click());await page.waitForSelector('#order-review[open]');await page.click('#order-review-confirm');
 await page.waitForFunction(()=>document.querySelector('#tactical-status-g').textContent==='1 actif(s) / 1 groupe(s)');
 await page.$eval('#squad-stop',e=>e.click());
 await page.waitForFunction(()=>document.querySelector('#tactical-status-g').textContent==='0 actif(s) / 1 groupe(s)');
 await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.emergencyLand());
 for(const width of [1440,768,390]){
  await page.setViewport({width,height:1000});await page.$eval('.tactical-toolbar',e=>e.scrollIntoView({block:'start'}));
  assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));
  assert(await page.$$eval('.tactical-shortcut',els=>els.every(e=>e.scrollWidth<=e.clientWidth)));
  await page.screenshot({path:`/private/tmp/diamants-context-${width}.png`});
 }
 assert.deepEqual(errors,[]);console.log('PASS: navigation-only agent focus, zero/critical/resolved alerts, squad create/run/cancel counts, 1440/768/390px, no JS errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
