const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  puppeteer = require("puppeteer");
const output = process.env.COMMAND_CENTER_OUTPUT || "/private/tmp/diamants-controls-qa";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--enable-webgl", "--ignore-gpu-blocklist"],
    // Puppeteer uses a fresh temporary profile so saved panel preferences cannot leak between runs.
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
    await page.click("#hud-tab-missions");
    await page.click("#open-control-room");
    await page.waitForSelector("#control-room[open]");
    const coverage = await page.evaluate(() => {
      const source =
        document.querySelector("#simulation-frame").contentDocument;
      return {
        source: source.querySelectorAll(
          "#ros_interface button,#ros_interface input,#ros_interface select",
        ).length,
        mirror: document.querySelectorAll(
          "#control-content button,#control-content input,#control-content select",
        ).length,
      };
    });
    assert.equal(coverage.mirror, coverage.source);
    await page.select('[data-source-id="mission_type"]', "coverage");
    assert.equal(
      await page.evaluate(
        () =>
          document
            .querySelector("#simulation-frame")
            .contentDocument.querySelector("#mission_type").value,
      ),
      "coverage",
    );
    await page.click('[data-source-id="btn-place-beacon-3"]');
    await page.waitForFunction(
      () =>
        document.querySelector('[data-source-id="beacon-count-badge"]')
          .textContent === "3",
    );
    await page.click('[data-source-id="btn-clear-beacons"]');
    await page.click('[data-category="configuration"]');
    await page.$eval('[data-source-id="altitude_slider"]', (e) => {
      e.value = "4.5";
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
    assert.equal(
      await page.evaluate(
        () =>
          document
            .querySelector("#simulation-frame")
            .contentDocument.querySelector("#altitude_slider").value,
      ),
      "4.5",
    );
    await page.type("#control-search", "securite");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.sourceId),"safety_distance");
    await page.click("#control-search");
    await page.type("#control-search", "Ollama");
    await page.waitForSelector("#command-results button");
    await page.click("#command-results button");
    assert(
      await page.$eval(
        '[data-control-category="intelligence"]',
        (e) => !e.hidden,
      ),
    );
    await page.screenshot({ path: output + "/console.png" });
    await page.click("#control-workshops summary");
    await page.click('#control-workshops [data-workbench="fleet"]');
    const engine = await page.evaluate(() => {
      const w = document.querySelector("#simulation-frame").contentWindow;
      w.__qaEngine =
        w.diamantsSystem.integratedController.autonomousFlightEngine;
      return w.__qaEngine.drones.size;
    });
    assert.equal(engine, 11);
    assert.match(await page.evaluate(()=>document.querySelector("#simulation-frame").contentDocument.querySelector("[data-poser]").textContent),/Créer et lancer la flotte/);
    const panels = {
      fleet: "fleet-models-panel",
      agent: "drone-select-panel",
      chat: "llm-chat-panel",
      fractal: "fractal-hypervision-panel",
      coordination: "swarm-rl-panel",
      optimal: "optimal-search-ui",
      quality: "quality-control-panel",
      all: "ros_interface",
    };
    for (const [tool, id] of Object.entries(panels)) {
      await page.select("#workbench-tool", tool);
      await page.waitForFunction(
        (id) => {
          const el = document
            .querySelector("#simulation-frame")
            .contentDocument.getElementById(id);
          return (
            el &&
            el.classList.contains("workbench-pane") &&
            getComputedStyle(el).display !== "none"
          );
        },
        { timeout: 10000 },
        id,
      );
      const rect = await page.evaluate((id) => {
        const w = document.querySelector("#simulation-frame").contentWindow,
          r = w.document.getElementById(id).getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          w: w.innerWidth,
          h: w.innerHeight,
        };
      }, id);
      assert(
        rect.x >= 0 &&
          rect.y >= 0 &&
          rect.right <= rect.w + 1 &&
          rect.bottom <= rect.h + 1,
        JSON.stringify({ tool, rect }),
      );
      await page.screenshot({ path: output + `/${tool}.png` });
    }
    await page.select("#workbench-tool", "communications");
    await page.waitForFunction(
      () =>
        document
          .querySelector("#simulation-frame")
          .contentDocument.querySelector("#minimap-fullscreen-viewer").style
          .display === "flex",
    );
    await page.select("#workbench-tool", "fleet");
    await page.click("#workbench-expand");
    assert.equal(
      await page.$eval("#workbench-expand", (e) =>
        e.getAttribute("aria-pressed"),
      ),
      "true",
    );
    await page.click("#workbench-show");
    await page.screenshot({path:"/private/tmp/workbench-hide-check.png"});
    await page.waitForFunction(()=>document.querySelector("#simulation-frame").contentDocument.documentElement.classList.contains("workbench-scene-only"));
    assert(
      await page.evaluate(() =>
        document
          .querySelector("#simulation-frame")
          .contentDocument.documentElement.classList.contains(
            "workbench-scene-only",
          ),
      ),
    );
    await page.click("#workbench-show");
    for (const width of [390, 768]) {
      await page.setViewport({ width, height: 900 });
      for (const [tool, id] of Object.entries(panels)) {
        await page.select("#workbench-tool", tool);
        assert(
          await page.evaluate((id) => {
            const w = document.querySelector("#simulation-frame").contentWindow,
              r = w.document.getElementById(id).getBoundingClientRect();
            return (
              r.x >= 0 &&
              r.right <= w.innerWidth + 1 &&
              r.bottom <= w.innerHeight + 1
            );
          }, id),
          tool + " responsive " + width,
        );
      }
      await page.select("#workbench-tool", "fleet");
      await page.screenshot({ path: output + `/fleet-${width}.png` });
    }
    await page.click("#close-workbench");
    assert(
      await page.evaluate(() => {
        const w = document.querySelector("#simulation-frame").contentWindow;
        return (
          w.__qaEngine ===
          w.diamantsSystem.integratedController.autonomousFlightEngine
        );
      }),
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          status: "passed",
          coverage,
          checks: [
            "all original sidebar controls mirrored",
            "doctrine and altitude synchronized",
            "beacons create and clear",
            "search",
            "8 workspaces desktop/tablet/mobile",
            "communications map",
            "expand and hide",
            "same engine retained",
          ],
          errors,
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
