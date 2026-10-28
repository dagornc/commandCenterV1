const assert=require('node:assert/strict'),fs=require('node:fs'),p=require('puppeteer');
(async()=>{const browser=await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});const results=[];try{
 for(const doctrine of ['exploration','swarm','coverage','formation','search']){
 console.log('TEST',doctrine);const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
 const frame=page.frames().find(f=>f.url().includes('simulation.html'));
 await frame.evaluate(()=>{window.testCommands=[];const c=window.panelController,send=c.sendWebSocketCommand.bind(c);c.sendWebSocketCommand=(type,payload)=>{window.testCommands.push({type,payload});return send(type,payload);};});
 if(await page.$eval('#hud-left',e=>e.hidden)||await page.$eval('#hud-pane-missions',e=>e.hidden))await page.click('#hud-tab-missions');await page.click('#open-control-room');await page.select('[data-source-id="mission_type"]',doctrine);
 const modes=await page.$$eval('[data-source-id="mode_select"] option',es=>es.map(e=>e.value));
 for(const mode of modes){await page.select('[data-source-id="mode_select"]',mode);const state=await frame.evaluate(()=>{const d=window.DIAMANTS_DOCTRINE,e=window.DIAMANTS.flightEngine;return {doctrine:d.currentDoctrine.id,mode:d.currentCOA.id,pattern:e.explorationPattern,expected:d.currentCOA.waypointGenerator};});assert.equal(state.doctrine,doctrine);assert.equal(state.mode,mode);assert.equal(state.pattern,state.expected);}
 await page.select('[data-source-id="mode_select"]','adaptive');await page.click('#close-control-room');
 await page.click('#dock-launch');await page.waitForSelector('#order-review[open]');assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');await page.click('#order-review-cancel');assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');
 await page.click('#dock-launch');await page.click('#order-review-confirm');await page.waitForFunction(()=>[...document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine.drones.values()].every(s=>s.phase==='EXPLORE'),{timeout:90000}).catch(async e=>{console.error('FLIGHT',await frame.evaluate(()=>[...window.DIAMANTS.flightEngine.drones.values()].map(s=>({id:s.id,phase:s.phase,y:s.position.y}))),errors);throw e;});
 assert.equal(await frame.evaluate(()=>window.testCommands.find(c=>c.payload.action==='start')?.payload.mission_type),doctrine,'transport preserves selected doctrine');
 const start=await frame.evaluate(()=>[...window.DIAMANTS.flightEngine.drones.values()].map(s=>({x:s.position.x,z:s.position.z})));
 await page.waitForFunction(start=>[...document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine.drones.values()].some((s,i)=>Math.hypot(s.position.x-start[i].x,s.position.z-start[i].z)>.5),{timeout:20000},start);
 if(await page.$eval('#hud-left',e=>e.hidden)||await page.$eval('#hud-pane-missions',e=>e.hidden))await page.click('#hud-tab-missions');await page.click('#open-control-room');
 for(const mode of modes){await page.select('[data-source-id="mode_select"]',mode);await new Promise(resolve=>setTimeout(resolve,1000));assert(await frame.evaluate(()=>[...window.DIAMANTS.flightEngine.drones.values()].every(s=>[s.position.x,s.position.y,s.position.z].every(Number.isFinite))),'finite flight state '+mode);}
 await page.click('#close-control-room');
 await page.click('.command-dock [data-command="return"]');await page.click('#order-review-confirm');await page.waitForFunction(()=>[...document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine.drones.values()].every(s=>s.phase==='LANDED'),{timeout:120000});
 assert.deepEqual(errors,[]);results.push({doctrine,modes,launch:'passed',movement:'passed',returnAndLanding:'passed',errors});console.log('PASS '+doctrine+' : 7 modes, preview cancellation, launch, movement, return and landing');await page.close();
 }
}finally{fs.writeFileSync('/private/tmp/all-missions-results.json',JSON.stringify(results,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
