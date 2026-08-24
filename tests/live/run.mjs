import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { startStaticServer } from "../helpers/server.mjs";

const engines = { chromium, firefox, webkit };
const server = await startStaticServer();
const results = [];

try {
  for (const [name, engine] of Object.entries(engines)) {
    const browser = await engine.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${server.origin}/tests/live/fixture.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      window.livePlayer = window.YellowVSL.autoInit()[0];
      await window.livePlayer.ready;
    }, { timeout: 30000 });
    await page.waitForSelector("#live iframe[src*='youtube.com/embed']", { timeout: 30000 });
    const state = await page.evaluate(() => window.livePlayer.getState());
    assert.equal(state.ready, true, `${name}: ready`);
    assert.ok(state.duration > 0, `${name}: duration received`);
    await page.locator("#live .yvsl-play").click();
    await page.waitForFunction(() => window.livePlayer.getState().playerState === 1, { timeout: 15000 });
    await page.waitForFunction(() => window.livePlayer.getState().currentTime > 0, { timeout: 15000 });
    assert.deepEqual(errors, [], `${name}: no page errors`);
    results.push(`${name}: ready and playing, duration ${Math.round(state.duration)}s`);
    await browser.close();
  }
} finally {
  await server.close();
}

console.log(results.join("\n"));
