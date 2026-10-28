const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.COMMAND_CENTER_URL || 'http://localhost:5550/');
    await page.waitForFunction(() => !document.querySelector('#launch-button').disabled, {timeout: 60000});
    await page.evaluate(() => {
      const w = document.querySelector('#simulation-frame').contentWindow;
      const engine = w.diamantsSystem.integratedController.autonomousFlightEngine;
      const original = engine.startExploration.bind(engine);
      w.__explorationCalls = 0;
      engine.startExploration = (...args) => { w.__explorationCalls++; return original(...args); };
      w.document.querySelector('[data-poser]').click();
    });
    await page.waitForFunction(() => {
      const c = document.querySelector('#simulation-frame').contentWindow.diamantsSystem.integratedController;
      return c.autonomousFlightEngine.drones.size === 12 && c.missionStarted;
    });
    await page.evaluate(() => document.querySelector('#simulation-frame').contentWindow.emergencyLand());
    await new Promise(resolve => setTimeout(resolve, 7000));
    const calls = await page.evaluate(() => document.querySelector('#simulation-frame').contentWindow.__explorationCalls);
    assert.equal(calls, 0, 'Adding a drone must not restart exploration after an emergency stop');
    await page.evaluate(() => document.querySelector('#simulation-frame').contentWindow.launchMission());
    await page.waitForFunction(() => document.querySelector('#simulation-frame').contentWindow.__explorationCalls > 0, {timeout: 15000});
    await page.evaluate(() => document.querySelector('#simulation-frame').contentWindow.emergencyLand());
    assert.deepEqual(errors, []);
    console.log('PASS: native fleet creation followed by emergency stop has no delayed restart; explicit relaunch works; no page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
