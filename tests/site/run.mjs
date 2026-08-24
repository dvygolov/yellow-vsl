import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { startStaticServer } from "../helpers/server.mjs";

const server = await startStaticServer(resolve("site-dist"));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.addInitScript({ path: resolve("tests/browser/fake-youtube.js") });
  await page.goto(`${server.origin}/`);
  await page.waitForFunction(() => document.documentElement.dataset.playersReady === "true");

  assert.equal(await page.title(), "YellowVSL — бесплатный VSL-плеер на YouTube");
  assert.equal(await page.locator("[data-fake-youtube]").count(), 4, "четыре живых примера инициализированы");
  assert.equal((await page.locator("body").innerText()).includes("__VERSION__"), false, "версия подставлена при сборке");
  assert.match(await page.locator("#install-code").textContent(), /yellow-vsl@v1\.1\.0/);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), "https://yellowvsl.pages.dev/og.png");

  await page.evaluate(() => {
    const player = window.yellowVslSite.examplePlayer;
    player.adapter.player.time = 6.1;
    player.timeline.maxWatched = 6.1;
    player._tick();
  });
  assert.equal(await page.locator("#example-player .yvsl-cta").isVisible(), true, "CTA появляется по времени");
  assert.equal(await page.locator("#example-offer").isVisible(), true, "CTA раскрывает оффер");

  await page.click("#example-forward");
  assert.equal(await page.locator("#example-result").getAttribute("data-state"), "pass", "переход вперёд заблокирован");

  await page.click("#open-popup");
  assert.equal(await page.locator(".yvsl-popup-backdrop").isVisible(), true, "popup открыт");
  await page.click(".yvsl-popup-close");
  assert.equal(await page.locator(".yvsl-popup-backdrop").isHidden(), true, "popup закрыт");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    viewport: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    playerWidth: document.querySelector("#hero-player .yvsl-root").getBoundingClientRect().width,
    controlsOverflow: document.querySelector("#hero-player .yvsl-controls").scrollWidth - document.querySelector("#hero-player .yvsl-controls").clientWidth
  }));
  assert.equal(mobile.pageWidth, mobile.viewport, "нет горизонтального overflow");
  assert.ok(mobile.playerWidth <= mobile.viewport, "плеер помещается в мобильный viewport");
  assert.ok(mobile.controlsOverflow <= 1, "controls не переполняются");
  assert.deepEqual(pageErrors, [], "нет ошибок страницы");

  console.log("yellowvsl.pages.dev site: ok");
} finally {
  await browser.close();
  await server.close();
}
