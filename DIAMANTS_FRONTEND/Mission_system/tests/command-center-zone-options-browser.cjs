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
    await page.$eval('#zone-width', e => {e.focus();e.value='240';e.dispatchEvent(new Event('input',{bubbles:true}));e.blur();});
    await new Promise(r=>setTimeout(r,700));
    assert.equal(await page.$eval('#zone-width',e=>e.value),'240','unapplied dimensions survive a temporary loss of focus');
    await new Promise(r=>setTimeout(r,700));
    await page.$eval('#zone-depth', e => {e.focus();e.value='180';});
    await page.click('#zone-apply');
    assert.deepEqual(await bounds(),{x:120,z:90});
    await page.click('#zone-undo');
    assert.deepEqual(await bounds(),{x:60,z:60});
    await page.select('#zone-preset','240');
    assert.deepEqual(await bounds(),{x:120,z:120});
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#launch-button').disabled, {timeout:60000});
    assert.deepEqual(await bounds(),{x:120,z:120});
    assert.equal(await page.$eval('#metric-airborne', e=>e.textContent),'00');
    await page.click('#resize-zone');
    await page.click('#plan-finish');
    await page.$eval('#map-stage', e=>e.scrollIntoView({block:'center'}));
    const edge=await page.$eval('#tactical-map',e=>{const r=e.getBoundingClientRect();const scale=Math.min((r.width-110)/240,(r.height-110)/240);return {x:r.x+r.width/2+120*scale,y:r.y+r.height/2};});
    await page.mouse.move(edge.x,edge.y);
    await page.mouse.down();
    await page.mouse.move(edge.x+25,edge.y,{steps:8});
    await page.mouse.up();
    const resized=await bounds();
    assert(resized.x>120);
    assert.equal(resized.z,120,'edge drag must preserve depth');
    await page.click('#zone-undo');
    assert.deepEqual(await bounds(),{x:120,z:120});
    await page.setViewport({width:390,height:844});
    assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth));
    await page.click('#launch-button');
    await page.waitForFunction(()=>document.querySelector('#resize-zone').disabled);
    await page.evaluate(()=>document.querySelector('#simulation-frame').contentWindow.emergencyLand());
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'/private/tmp/diamants-resize.png'});
    console.log('PASS: exact dimensions, undo, presets, reload without launch, direct edge resize, mobile layout, flight lock');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
