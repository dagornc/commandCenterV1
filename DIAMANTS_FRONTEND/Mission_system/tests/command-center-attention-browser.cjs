const assert = require("node:assert/strict");
const puppeteer = require("puppeteer");
const fs = require("node:fs");
const output =
  process.env.COMMAND_CENTER_OUTPUT || "/private/tmp/diamants-attention-qa";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--enable-webgl", "--ignore-gpu-blocklist"],
    userDataDir: output + "/profile",
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(process.env.COMMAND_CENTER_URL || "http://localhost:5550/");
    await page.waitForFunction(
      () => !document.querySelector("#launch-button").disabled,
      { timeout: 60000 },
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    assert(
      await page.$eval(".command-dock", (el) => {
        const r = el.getBoundingClientRect();
        return r.bottom <= innerHeight + 1 && r.top >= 0;
      }),
    );
    assert.equal(
      await page.$$eval(".command-dock [data-command]", (els) => els.length),
      5,
    );
    await page.click("[data-select]");
    assert.notEqual(await page.$eval('#focus-agent', el => el.getAttribute('aria-pressed')), 'true');
    await page.click('#focus-agent');
    await page.waitForFunction(
      () =>
        document.querySelector("#focus-agent").getAttribute("aria-pressed") ===
        "true",
    );
    await page.click("#fit-fleet");
    await page.waitForFunction(
      () =>
        document.querySelector("#fit-fleet").getAttribute("aria-pressed") ===
        "true",
    );
    // Controlled telemetry fixture in this disposable browser only. No app demo data.
    const id = await page.evaluate(() => {
      const state = [
        ...document
          .querySelector("#simulation-frame")
          .contentWindow.DIAMANTS.flightEngine.drones.values(),
      ][2];
      state.battery = 9;
      return state.id;
    });
    await page.waitForSelector(`[data-attention-agent="${id}"]`);
    assert.equal(
      await page.$eval("#attention-count", (el) => el.textContent),
      "1",
    );
    await page.click(`[data-attention-agent="${id}"]`);
    assert.match(await page.$eval("#agent-name", (el) => el.textContent), /03/);
    await page.waitForFunction(
      () =>
        document.querySelector("#focus-agent").getAttribute("aria-pressed") ===
        "true",
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: output + "/attention-desktop.png",
      fullPage: true,
    });
    await page.evaluate((id) => {
      delete document
        .querySelector("#simulation-frame")
        .contentWindow.DIAMANTS.flightEngine.drones.get(id).battery;
    }, id);
    await page.waitForFunction(
      () => document.querySelector("#attention-count").textContent === "0",
    );
    for (const width of [390, 768]) {
      await page.setViewport({ width, height: 844 });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      assert(
        await page.evaluate(() => document.body.scrollWidth <= innerWidth),
      );
      const controls = await page.$$eval(
        ".command-dock [data-command]",
        (els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.top >= 0 &&
              r.bottom <= innerHeight &&
              r.left >= 0 &&
              r.right <= innerWidth
            );
          }),
      );
      assert(controls.every(Boolean));
      await page.screenshot({
        path: output + `/dock-${width}.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          status: "passed",
          checks: [
            "5 fixed commands at page bottom",
            "selection focus and fleet framing",
            "critical battery attention from controlled telemetry",
            "alert click selects agent",
            "resolved alert removed",
            "all controls inside mobile/tablet viewport",
          ],
          errors,
          output,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
