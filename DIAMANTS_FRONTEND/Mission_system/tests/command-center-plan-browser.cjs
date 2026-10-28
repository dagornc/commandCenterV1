const assert = require("node:assert/strict");
const puppeteer = require("puppeteer");
const fs = require("node:fs");
const output = process.env.COMMAND_CENTER_OUTPUT || "/private/tmp/diamants-plan-qa";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--enable-webgl", "--ignore-gpu-blocklist"],
    // Use an isolated temporary browser profile for reproducible draft state.
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(process.env.COMMAND_CENTER_URL || "http://localhost:5550/");
    await page.waitForFunction(
      () => !document.querySelector("#launch-button").disabled,
      { timeout: 60000 },
    );
    const click = async selector => {
      await page.$eval(selector, e => e.scrollIntoView({block:'center',behavior:'instant'}));
      await page.click(selector);
    };
    const width = await page.$eval(
      "#tactical-map",
      (e) => e.getBoundingClientRect().width,
    );
    await click("#context-agent");
    assert(!(await page.$eval("#agent-inspector", e=>e.hidden)));
    await click("#context-zone");
    assert(await page.$eval("#agent-inspector", e=>e.hidden));
    assert.equal(await page.$eval("#tactical-map", e=>e.getBoundingClientRect().width),width);
    await click("#plan-point");
    let r = await page.$eval("#tactical-map", (e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.click(r.x + r.w / 2 + 45, r.y + r.h / 2 + 35);
    await page.waitForSelector("#plan-targets li");
    await page.mouse.click(r.x + r.w / 2 - 45, r.y + r.h / 2 - 35);
    assert.equal(await page.$$eval("#plan-targets li", (e) => e.length), 2);
    await click("#plan-undo");
    assert.equal(await page.$$eval("#plan-targets li", (e) => e.length), 1);
    await click("#plan-clear");
    assert.equal(await page.$$eval("#plan-targets li", (e) => e.length), 0);
    await click("#plan-zone");
    r = await page.$eval("#tactical-map", (e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.click(r.x + r.w / 2 - 40, r.y + r.h / 2 - 40);
    await page.mouse.click(r.x + r.w / 2 + 40, r.y + r.h / 2 + 40);
    await page.waitForFunction(
      () => document.querySelectorAll("#plan-targets li").length === 9,
    );
    await click("#dock-launch");
    await page.waitForSelector("#order-review[open]");
    await page.click("#order-review-confirm");
    assert(await page.$eval("#plan-zone", (e) => e.disabled));
    await page.waitForFunction(
      () =>
        [
          ...document
            .querySelector("#simulation-frame")
            .contentWindow.DIAMANTS.flightEngine.drones.values(),
        ].some((s) => s._lastAction?.startsWith("Objectif")),
      { timeout: 45000 },
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("#agent-objective")
          .textContent.includes("Objectif"),
      { timeout: 45000 },
    );
    await page.screenshot({
      path: output + "/mission-desktop.png",
      fullPage: true,
    });
    await click('[data-command="stop"]');
    for (const width of [390, 768]) {
      await page.setViewport({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: output + `/mission-${width}.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: plan targets, undo, survey, engine execution, edit lock, inspector, mobile/tablet, no page errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
