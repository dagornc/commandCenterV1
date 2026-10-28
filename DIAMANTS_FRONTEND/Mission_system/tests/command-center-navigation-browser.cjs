const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
(async () => {
 const browser = await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
 try {
  const page = await browser.newPage(), errors=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({width:1440,height:1000});
  await page.goto(process.env.COMMAND_CENTER_URL || 'http://127.0.0.1:5550/');
  await page.waitForFunction(() => !document.querySelector('#launch-button').disabled,{timeout:60000});
  await page.evaluate(() => window.originalFrame = document.querySelector('#simulation-frame').contentWindow);
  await page.click('#navigation-search-open');
  assert.equal(await page.$eval('#navigation-search',e=>e.open),true);
  await page.type('#navigation-query','preferences');
  assert.equal(await page.$$eval('.navigation-result',e=>e.length),1);
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('#settings-dialog',e=>e.open),true);
  await page.keyboard.press('Escape');
  await page.click('#navigation-search-open');
  await page.type('#navigation-query','escadrons');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  assert.equal(await page.$eval('#context-squad',e=>e.getAttribute('aria-pressed')),'true');
  await page.click('#navigation-search-open');
  await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
  assert.equal(await page.$$eval('dialog[open]',e=>e.length),1,'No stacked modal');
  await page.type('#navigation-query','introuvable');
  assert.equal(await page.$$eval('.navigation-result',e=>e.length),0);
  await page.keyboard.press('Enter'); assert.equal(await page.$eval('#navigation-search',e=>e.open),true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#navigation-search').open && document.activeElement.id === 'navigation-search-open');
  await page.keyboard.press('o'); assert.equal(await page.$eval('#navigation-search',e=>e.open),true);
  await page.type('#navigation-query','communications'); await page.keyboard.press('Enter');
  assert.equal(await page.$eval('#map-stage',e=>e.classList.contains('workbench')),true);
  await page.click('#close-workbench');
  await page.focus('#fleet-search'); await page.keyboard.press('/');
  assert.equal(await page.$eval('#navigation-search',e=>e.open),false,'Typing must not open navigation');
  assert.equal(await page.evaluate(()=>window.originalFrame===document.querySelector('#simulation-frame').contentWindow),true);
  assert.equal(await page.$eval('#metric-airborne',e=>e.textContent),'00');
  for (const width of [1440,768,390]) {
   await page.setViewport({width,height:1000}); if(await page.$eval('#hud-left',e=>e.hidden))await page.click('#hud-toggle-left');await page.$eval('#navigation-search-open',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click('#navigation-search-open');
   assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth),'Page fits viewport');
   assert(await page.$eval('#navigation-search',e=>e.scrollWidth<=e.clientWidth),'Dialog fits viewport');
   await page.screenshot({path:`/private/tmp/diamants-navigation-${width}.png`});
   await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: navigation, accents, keyboard, empty results, focus, modal isolation, workshops, typing, same engine, no launch, 1440/768/390px, no JS errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
