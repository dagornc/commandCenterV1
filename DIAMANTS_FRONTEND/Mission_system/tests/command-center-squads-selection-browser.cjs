const assert=require('node:assert/strict'), puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
 try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
  await page.goto(process.env.COMMAND_CENTER_URL||'http://127.0.0.1:5550/');await page.waitForFunction(()=>!document.querySelector('#launch-button').disabled,{timeout:60000});
  await page.$eval('#map-stage',e=>e.scrollIntoView({block:'center'}));
  const r=await page.$eval('#tactical-map',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
  await page.keyboard.down('Shift');await page.mouse.move(r.x+10,r.y+10);await page.mouse.down();await page.mouse.move(r.x+r.w-10,r.y+r.h-10,{steps:12});await page.mouse.up();await page.keyboard.up('Shift');
  assert.equal(await page.$$eval('#squad-members-list input:checked',e=>e.length),11);
  await page.type('#squad-name','Equipe complète');await page.click('#squad-create');
  await page.click('#squad-add');await page.select('#squad-order-type','wait');await page.click('#squad-add');
  await page.click('[aria-label="Monter l’ordre 2"]');assert.match(await page.$eval('#squad-orders li',e=>e.textContent),/Attendre/);
  await page.click('[aria-label="Supprimer l’ordre 1"]');assert.equal(await page.$$eval('#squad-orders li',e=>e.length),1);
  await page.$eval('#squad-members-list input',e=>e.click());await page.click('#squad-create');
  await page.$eval('#squad-create',e=>e.blur());await page.keyboard.press('1');assert.equal(await page.$eval('#squad-groups',e=>e.value),'1');
  await page.setViewport({width:390,height:844});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS: rectangle multi-selection, group recall, queue reorder/delete, mobile, no page errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
