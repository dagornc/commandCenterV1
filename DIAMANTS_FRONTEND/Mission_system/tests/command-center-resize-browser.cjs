const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless:true,
    executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist']});
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({width:1440,height:1000});
    await page.goto(process.env.COMMAND_CENTER_URL || 'http://127.0.0.1:5550/');
    await page.waitForFunction(() => !document.querySelector('#launch-button').disabled, {timeout:60000});
    const bounds = () => page.evaluate(() => {
      const w = document.querySelector('#simulation-frame').contentWindow;
      return {...w.diamantsSystem.integratedController.autonomousFlightEngine._getHalfBoundsXZ()};
    });
    const before = await bounds();
    await page.click('#resize-zone');
    const corner = await page.$eval('#tactical-map', (el,b) => {
      const r=el.getBoundingClientRect();
      const scale=Math.min((r.width-110)/(b.x*2),(r.height-110)/(b.z*2));
      return {x:r.x+r.width/2+b.x*scale,y:r.y+r.height/2+b.z*scale};
    },before);
    await page.mouse.move(corner.x,corner.y);
    await page.mouse.down();
    await page.mouse.move(corner.x+25,corner.y+25,{steps:10});
    assert.deepEqual(await bounds(),before,'preview must not modify the engine');
    await page.mouse.up();
    const after=await bounds();
    assert(after.x>before.x && after.z>before.z,'drag must enlarge both dimensions');
    const inputs=await page.evaluate(() => {
      const d=document.querySelector('#simulation-frame').contentDocument;
      return [+d.getElementById('bounds_x').value,+d.getElementById('bounds_y').value];
    });
    assert.deepEqual(inputs,[after.x*2,after.z*2]);
    await page.mouse.move(corner.x,corner.y);
    await page.mouse.down();
    await page.mouse.move(corner.x+15,corner.y+15,{steps:5});
    await page.keyboard.press('Escape');
    await page.mouse.up();
    assert.deepEqual(await bounds(),after,'Escape cancels resize');
    assert.equal(await page.$eval('#resize-zone',e=>e.getAttribute('aria-pressed')),'false');
    await page.click('#launch-button');
    await page.waitForFunction(()=>document.querySelector('#resize-zone').disabled);
    await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.emergencyLand());
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'/private/tmp/diamants-resize.png'});
    console.log('PASS: mouse resize, preview, engine and inputs synchronization, Escape cancellation, flight lock, no page errors', {before,after});
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
