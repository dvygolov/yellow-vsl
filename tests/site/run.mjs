import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { startStaticServer } from "../helpers/server.mjs";

const server = await startStaticServer(resolve("site-dist"));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ru-RU" });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.addInitScript({ path: resolve("tests/browser/fake-youtube.js") });
  await page.goto(`${server.origin}/`);
  await page.waitForFunction(() => document.documentElement.dataset.playersReady === "true");

  assert.equal(await page.title(), "YellowVSL - бесплатный VSL-плеер на YouTube");
  assert.equal(await page.getAttribute("html", "lang"), "ru", "русский выбирается по языку браузера");
  assert.equal(await page.locator('[data-language="ru"]').getAttribute("aria-current"), "page", "русский флаг активен");
  assert.equal(await page.locator("[data-fake-youtube]").count(), 3, "три inline-примера инициализированы сразу");
  assert.equal(await page.evaluate(() => window.yellowVslSite.heroPlayer.getState().videoId), "Y7jHPB7FjhM", "на сайте используется выбранное видео");
  assert.equal(await page.evaluate(() => window.yellowVslSite.heroPlayer.options.playback.end), null, "hero показывает полное видео");
  assert.equal(await page.evaluate(() => window.yellowVslSite.examplePlayer.options.playback.end), null, "основной пример показывает полное видео");
  assert.equal(await page.locator("#hero-player [data-fake-youtube]").evaluate((node) => getComputedStyle(node).pointerEvents), "none", "YouTube iframe не получает hover");
  assert.equal((await page.locator("body").innerText()).includes("Это настоящий плеер, а не картинка"), false, "нежелательная подпись удалена");
  assert.equal((await page.locator("body").innerText()).includes("__VERSION__"), false, "версия подставлена при сборке");
  assert.match(await page.locator("#install-code").textContent(), /yellow-vsl@v1\.4\.1/);
  assert.match(await page.locator("#modes-code").textContent(), /\[5, 50\].*\[30, 70\].*\[50, 90\]/s);
  assert.match(await page.locator("#cta-code").textContent(), /background: "#ff3b30"/);
  assert.match(await page.locator("#docs-link").getAttribute("href"), /yellow-vsl#configuration-reference$/);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), "https://yellowvsl.pages.dev/og.png");

  await page.evaluate(() => {
    const player = window.yellowVslSite.examplePlayer;
    player.adapter.player.time = 6.1;
    player.timeline.maxWatched = 6.1;
    player._tick();
  });
  assert.equal(await page.locator("#example-player .yvsl-cta").isVisible(), true, "CTA появляется по времени");
  assert.equal(await page.locator("#example-player .yvsl-cta").evaluate((node) => node.parentElement.classList.contains("yvsl-zone--bottom-right")), true, "CTA находится справа снизу поверх видео");
  assert.equal(await page.locator("#example-player .yvsl-cta").evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(255, 212, 0)", "CTA принимает свой цвет фона");
  assert.equal(await page.locator("#example-player .yvsl-cta").evaluate((node) => getComputedStyle(node).color), "rgb(23, 20, 0)", "CTA принимает свой цвет текста");
  assert.equal(await page.locator("#example-offer").isVisible(), true, "CTA раскрывает оффер");

  await page.click("#example-forward");
  assert.equal(await page.locator("#example-result").getAttribute("data-state"), "pass", "переход вперёд заблокирован");

  await page.click("#open-popup");
  assert.equal(await page.locator(".yvsl-popup-backdrop").isVisible(), true, "popup открыт");
  await page.waitForFunction(() => document.querySelectorAll("[data-fake-youtube]").length === 4);
  assert.equal(await page.locator("[data-fake-youtube]").count(), 4, "popup инициализирует четвёртый плеер после открытия");
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

  const enPage = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "en-US" });
  const enErrors = [];
  enPage.on("pageerror", (error) => enErrors.push(error.message));
  await enPage.addInitScript({ path: resolve("tests/browser/fake-youtube.js") });
  await enPage.goto(`${server.origin}/`);
  await enPage.waitForFunction(() => document.documentElement.dataset.playersReady === "true");
  assert.equal(await enPage.getAttribute("html", "lang"), "en", "английский выбирается по языку браузера");
  assert.equal(await enPage.title(), "YellowVSL - free YouTube VSL player");
  assert.equal(await enPage.locator('[data-language="en"]').getAttribute("aria-current"), "page", "английский флаг активен");
  assert.equal(/[А-Яа-яЁё]/.test(await enPage.locator("body").innerText()), false, "в английской версии не осталось русского текста");
  assert.match(await enPage.locator("#docs-link").getAttribute("href"), /README\.en\.md#configuration-reference$/);
  assert.equal(await enPage.evaluate(() => window.yellowVslSite.heroPlayer.options.playback.end), null, "английский hero показывает полное видео");
  await enPage.locator('[data-language="ru"]').click();
  await enPage.waitForFunction(() => document.documentElement.lang === "ru");
  assert.match(enPage.url(), /[?&]lang=ru/);
  assert.deepEqual(enErrors, [], "в английской версии нет ошибок страницы");
  await enPage.close();

  console.log("yellowvsl.pages.dev RU/EN site: ok");
} finally {
  await browser.close();
  await server.close();
}
