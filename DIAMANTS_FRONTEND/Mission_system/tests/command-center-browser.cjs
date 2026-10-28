/** Real-browser integration checks. Start npm run dev first; no backend needed. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");
const base = process.env.COMMAND_CENTER_URL || "http://localhost:5550/";
const output =
  process.env.COMMAND_CENTER_OUTPUT || "/private/tmp/diamants-command-qa";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const options = {
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist"],
    userDataDir: path.join(output, "chrome-profile"),
  };
  if (process.env.CHROME_PATH) options.executablePath = process.env.CHROME_PATH;
  else if (
    process.platform === "darwin" &&
    fs.existsSync(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    )
  )
    options.executablePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await puppeteer.launch(options);
  try {
    const page = await browser.newPage();
    const pageErrors = [],
      requestFailures = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("requestfailed", (r) =>
      requestFailures.push({ url: r.url(), error: r.failure()?.errorText }),
    );
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    const client = await page.createCDPSession();
    await client.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: output,
    });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => !document.querySelector("#launch-button").disabled,
      { timeout: 60000 },
    );
    assert.equal(
      await page.$$eval("[data-agent]", (rows) => rows.length),
      11,
      "default fleet",
    );
    await page.click("#settings-button");
    assert(await page.$eval("#settings-dialog", (el) => el.open));
    await page.keyboard.press("Escape");
    await page.keyboard.press("/");
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "fleet-search",
    );
    await page.type("#fleet-search", "x500");
    assert.equal(await page.$$eval("[data-agent]", (rows) => rows.length), 2);
    await page.click("[data-select]");
    assert.match(
      await page.$eval("#agent-name", (el) => el.textContent),
      /X500/,
    );
    await page.click("#fleet-search", { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.select("#fleet-filter", "airborne");
    assert.equal(await page.$$eval("[data-agent]", (rows) => rows.length), 0);
    await page.select("#fleet-filter", "all");
    await page.click('[data-layer="links"]');
    assert.equal(
      await page.$eval('[data-layer="links"]', (el) =>
        el.getAttribute("aria-pressed"),
      ),
      "true",
    );
    // Launch, then stop before delayed exploration; stale callbacks must be canceled.
    await page.click("#launch-button");
    await page.waitForFunction(
      () => !document.querySelector('[data-command="stop"]').disabled,
    );
    await page.click('[data-command="stop"]');
    await page.waitForFunction(
      () => document.querySelector("#mission-state").textContent === "ARRÊTÉ",
      { timeout: 20000 },
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector("#simulation-frame").contentWindow
            .diamantsSystem.integratedController._missionStartTimer,
      ),
      null,
    );
    await page.click("#launch-button");
    await page.waitForFunction(
      () => {
        const states =
          document.querySelector("#simulation-frame").contentWindow.DIAMANTS
            .flightEngine.drones;
        return [...states.values()].some((d) => d.phase === "EXPLORE");
      },
      { timeout: 20000 },
    );
    await page.waitForFunction(
      () =>
        parseFloat(document.querySelector("#metric-coverage").textContent) > 0,
      { timeout: 20000 },
    );
    await page.waitForFunction(() => [...document.querySelector('#simulation-frame').contentWindow.DIAMANTS.flightEngine.drones.values()].some(d => Math.hypot(d.position.x, d.position.z) > 25), { timeout: 25000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(output, "desktop-tactical.png"),
      fullPage: true,
    });
    await page.click("#follow-button");
    assert(
      await page.$eval("#map-stage", (el) => el.classList.contains("scene")),
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#simulation-frame").contentWindow.diamantsSystem
          .autoFollow,
    );
    await page.click("#recenter");
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector("#simulation-frame").contentWindow
            .diamantsSystem.autoFollow,
      ),
      false,
    );
    await page.screenshot({
      path: path.join(output, "desktop-3d.png"),
      fullPage: true,
    });
    await page.click('[data-view="tactical"]');
    await page.click('[data-command="return"]');
    await page.waitForFunction(
      () =>
        document.querySelector("#mission-state").textContent ===
        "RETOUR / POSÉ",
      { timeout: 6000 },
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector("#simulation-frame").contentWindow
            .diamantsSystem.integratedController.missionStarted,
      ),
      false,
    );
    await page.waitForFunction(
      () =>
        [
          ...document
            .querySelector("#simulation-frame")
            .contentWindow.DIAMANTS.flightEngine.drones.values(),
        ].every((d) => d.phase === "LANDED" || d.phase === "IDLE"),
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#metric-airborne").textContent === "00" &&
        document.querySelector("#mission-state").textContent === "TERMINÉE",
    );
    assert.equal(
      await page.$eval("#launch-button", (el) => el.disabled),
      false,
    );
    await page.waitForSelector("#mission-reports li");
    assert.match(await page.$eval("#mission-reports",el=>el.textContent), /couverture/);
    await page.click("#export-button");
    await page.waitForFunction(() =>
      document.querySelector("#toast").textContent.includes("exportés"),
    );
    const exported = await new Promise((resolve, reject) => {
      let count = 0;
      const timer = setInterval(() => {
        const file = fs
          .readdirSync(output)
          .filter(
            (f) => f.startsWith("diamants-mission-") && f.endsWith(".json"),
          )
          .sort()
          .at(-1);
        if (file) {
          clearInterval(timer);
          resolve(file);
        } else if (++count > 40) {
          clearInterval(timer);
          reject(new Error("No downloaded report"));
        }
      }, 100);
    });
    const report = JSON.parse(
      fs.readFileSync(path.join(output, exported), "utf8"),
    );
    assert.equal(report.agents.length, 11);
    assert(report.events.some((e) => e.message.includes("Retour à la base")));
    for (const width of [390, 768]) {
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => document.body.scrollWidth <= innerWidth);
      await page.screenshot({
        path: path.join(output, `responsive-${width}.png`),
        fullPage: true,
      });
    }
    assert.deepEqual(pageErrors, [], "no uncaught browser exception");
    const result = {
      status: "passed",
      base,
      checks: [
        "11 real agents",
        "search and filter",
        "agent selection",
        "settings and keyboard",
        "map layers",
        "launch/stop cancellation",
        "live exploration and coverage",
        "3D follow and recenter",
        "return-to-home and landing",
        "JSON export",
        "390px and 768px layout",
      ],
      pageErrors,
      requestFailures,
      output,
    };
    fs.writeFileSync(
      path.join(output, "qa-results.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
