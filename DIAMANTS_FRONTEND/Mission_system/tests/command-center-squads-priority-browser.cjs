const assert=require('node:assert/strict'), puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
 try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
  await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
  await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.takeoffAllDrones());
  await page.waitForFunction(()=>[...document.querySelector('#simulation-frame').contentWindow.diamantsSystem.integratedController.autonomousFlightEngine.drones.values()][0].phase==='HOVER',{timeout:60000});
  await page.click('#context-squad');
  await page.$eval('#squad-members-list input',e=>e.click());await page.click('#squad-create');
  await page.select('#squad-order-type','wait');await page.$eval('#squad-seconds',e=>e.value='60');await page.click('#squad-add');await page.click('#squad-run');await page.waitForSelector('#order-review[open]');await page.click('#order-review-confirm');
  await page.waitForFunction(()=>document.querySelector('#squad-status').textContent.includes('En cours'));
  await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.launchMission());
  await page.waitForFunction(()=>document.querySelector('#squad-status').textContent.includes('annulée'));
  const phase=await page.evaluate(()=>[...document.querySelector('#simulation-frame').contentWindow.diamantsSystem.integratedController.autonomousFlightEngine.drones.values()][0].phase);
  assert.equal(phase,'EXPLORE','native global launch must not be overwritten by old queue cancellation');
  await new Promise(r=>setTimeout(r,1500));
  assert.equal(await page.evaluate(()=>[...document.querySelector('#simulation-frame').contentWindow.diamantsSystem.integratedController.autonomousFlightEngine.drones.values()][0].phase),'EXPLORE');
  await page.click('#squad-run');await page.waitForSelector('#order-review[open]');await page.click('#order-review-confirm');
  await page.waitForFunction(()=>document.querySelector('#squad-status').textContent.includes('En cours'));
  await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.takeoffAllDrones());
  await page.waitForFunction(()=>document.querySelector('#squad-status').textContent.includes('annulée'),{timeout:3000});
  await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.emergencyLand());
  assert.deepEqual(errors,[]);console.log('PASS: native global launch and takeoff override squad wait; emergency stop; no page errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
