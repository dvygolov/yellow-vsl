import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { startStaticServer } from "../helpers/server.mjs";

const server = await startStaticServer(resolve("site-dist"));
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(server.origin, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Object.values(window.yellowVslSite || {}).length === 6 &&
        Object.values(window.yellowVslSite).every(player => player.getState().ready));
      assert.equal(await page.evaluate(() => window.yellowVslSite.popupPlayer.popupOpen), false);
      const frame = await (await page.locator(".yvsl-popup-panel .yvsl-stage > iframe").elementHandle()).contentFrame();
      let navigations = 0;
      page.on("framenavigated", current => { if (current === frame) navigations++; });
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.locator("#open-popup").focus();
        await page.locator("#open-popup").press("Enter");
        const start = await page.evaluate(() => window.yellowVslSite.popupPlayer.getState().currentTime);
        await page.locator(".yvsl-popup-panel .yvsl-stage-interaction").click();
        await page.waitForFunction(position => {
          const state = window.yellowVslSite.popupPlayer.getState();
          return state.playerState === 1 && state.currentTime > position + 1;
        }, start);
        await page.keyboard.press("Escape");
        const state = await page.evaluate(() => ({
          ...window.yellowVslSite.popupPlayer.getState(),
          timer: window.yellowVslSite.popupPlayer.tickTimer,
          focus: document.activeElement.id,
          overflow: document.body.style.overflow
        }));
        assert.equal(state.popupOpen, false);
        assert.equal(state.playerState, 2);
        assert.equal(state.timer, null);
        assert.equal(state.focus, "open-popup");
        assert.equal(state.overflow, "");
      }
      assert.equal(navigations, 0, "Popup must preserve the loaded YouTube browsing context");
      console.log(`${name}: real YouTube popup opened, played and closed twice without iframe reloads`);
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
