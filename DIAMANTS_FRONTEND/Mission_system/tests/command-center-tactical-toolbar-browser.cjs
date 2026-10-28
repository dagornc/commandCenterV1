const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--enable-webgl','--ignore-gpu-blocklist']});
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({width:1440,height:1000});
    await page.goto(process.env.COMMAND_CENTER_URL || 'http://127.0.0.1:5551/');
    await page.waitForSelector('#tactical-p');
    await page.waitForFunction(() => !document.querySelector('#launch-button').disabled, {timeout:60000});
    await page.click('#tactical-g');
    assert.equal(await page.$eval('#context-squad', el => el.getAttribute('aria-pressed')), 'true');
    await page.keyboard.press('s');
    assert.equal(await page.$eval('body', el => el.dataset.workspace), 'supervise');
    await page.keyboard.press('p');
    assert.equal(await page.$eval('body', el => el.dataset.workspace), 'prepare');
    await page.keyboard.press('v');
    assert.equal(await page.$eval('#camera-bookmarks', el => el.open), true);
    await page.focus('#view-name');
    await page.keyboard.type('sgp');
    assert.equal(await page.$eval('body', el => el.dataset.workspace), 'prepare', 'typing must not navigate');
    await page.click('#tactical-help');
    await page.keyboard.press('s');
    assert.equal(await page.$eval('body', el => el.dataset.workspace), 'prepare', 'modal must suspend shortcuts');
    await page.keyboard.press('Escape');
    await page.click('#tactical-a');
    assert.equal(await page.$eval('#attention-list', el => el.hidden), false);
    // Cycle current alert controls through their existing click handlers.
    await page.evaluate(() => {
      const list = document.querySelector('#attention-list');
      list.innerHTML = '<button data-attention-id="test-one">One</button><button data-attention-id="test-two">Two</button>';
    });
    await page.click('#tactical-a');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.attentionId), 'test-one');
    await page.click('#tactical-a');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.attentionId), 'test-two');
    await page.click('#tactical-a');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.attentionId), 'test-one');
    assert.equal(await page.$eval('#metric-airborne', el => el.textContent), '00', 'navigation must never launch');
    await page.evaluate(() => document.querySelector('.tactical-toolbar').scrollIntoView({block:'start'}));
    await page.screenshot({path:'/private/tmp/diamants-tactical-desktop.png'});
    await page.setViewport({width:390,height:900});
    assert(await page.evaluate(() => document.body.scrollWidth <= innerWidth), 'no horizontal overflow');
    await page.screenshot({path:'/private/tmp/diamants-tactical-mobile.png'});
    assert.deepEqual(errors, []);
    console.log('PASS: navigation, typing/modal guards, bookmarks, alert cycling, no auto-launch, desktop/mobile, no page errors');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
