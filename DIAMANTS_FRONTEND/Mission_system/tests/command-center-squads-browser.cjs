const assert=require('node:assert/strict'), puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
 try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
  await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
  await page.click('#context-squad');
  await page.$eval('#squad-members-list input',e=>e.click());
  await page.type('#squad-name','Reconnaissance');await page.click('#squad-create');
  await page.$eval('#squad-x',e=>e.value='10');await page.$eval('#squad-z',e=>e.value='10');await page.click('#squad-add');
  await page.select('#squad-order-type','wait');await page.$eval('#squad-seconds',e=>e.value='2');await page.click('#squad-add');
  await page.select('#squad-order-type','return');await page.click('#squad-add');assert.equal(await page.$$eval('#squad-orders li',e=>e.length),3);
  await page.click('#squad-run');await page.waitForSelector('#order-review[open]');await page.click('#order-review-confirm');
  await page.waitForFunction(()=>document.querySelector('#squad-status').textContent.includes('En cours'));
  const phases=await page.evaluate(()=>[...document.querySelector('#simulation-frame').contentWindow.diamantsSystem.integratedController.autonomousFlightEngine.drones.values()].map(s=>s.phase));
  assert.equal(phases.filter(p=>p!=='IDLE').length,1,'only squad members take off');
  await page.waitForFunction(()=>document.querySelector('#squad-status').textContent.includes('Terminé'),{timeout:120000});
  const final=await page.evaluate(()=>[...document.querySelector('#simulation-frame').contentWindow.diamantsSystem.integratedController.autonomousFlightEngine.drones.values()].map(s=>s.phase));
  assert.equal(final[0],'LANDED');assert(final.slice(1).every(p=>p==='IDLE'));
  await page.click('#squad-run');await page.waitForSelector('#order-review[open]');await page.click('#order-review-confirm');await page.waitForFunction(()=>!document.querySelector('[data-command="stop"]').disabled);await page.click('[data-command="stop"]');
  await new Promise(r=>setTimeout(r,5000));assert.match(await page.$eval('#squad-status',e=>e.textContent),/annulée/);
  await page.setViewport({width:390,height:844});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS: scoped takeoff, move/wait/return sequence, other 10 drones idle, cancellation, mobile, no page errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
