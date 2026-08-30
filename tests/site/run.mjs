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
  await page.goto(`${server.origin}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.playersReady === "true");

  assert.equal(await page.title(), "YellowVSL - бесплатный VSL-плеер на YouTube");
  assert.equal(await page.getAttribute("html", "lang"), "ru", "русский выбирается по языку браузера");
  assert.equal(await page.locator('[data-language="ru"]').getAttribute("aria-current"), "page", "русский флаг активен");
  assert.equal(await page.locator("[data-fake-youtube]").count(), 6, "шесть примеров, включая popup, загружены заранее");
  assert.equal(await page.evaluate(() => window.yellowVslSite.heroPlayer.getState().videoId), "Y7jHPB7FjhM", "на сайте используется выбранное видео");
  assert.equal(await page.evaluate(() => window.yellowVslSite.heroPlayer.options.playback.end), null, "hero показывает полное видео");
  assert.equal(await page.evaluate(() => window.yellowVslSite.examplePlayer.options.playback.end), null, "основной пример показывает полное видео");
  assert.equal(await page.evaluate(() => window.yellowVslSite.heroPlayer.options.captions.enabled), false, "hero начинает с чистого YouTube-кадра");
  assert.equal(await page.evaluate(() => window.yellowVslSite.examplePlayer.options.captions.enabled), false, "основной пример начинает с чистого YouTube-кадра");
  assert.deepEqual(
    await page.evaluate(() => window.yellowVslSite.fastProgressPlayer.options.progress.points),
    [[0, 0], [0.001, 0.5], [0.1, 0.58], [0.5, 0.8], [1, 1]],
    "быстрый Smart Progress за первые секунды доходит до половины шкалы"
  );
  assert.equal(await page.evaluate(() => window.yellowVslSite.popupPlayer.options.progress.mode), "smart", "popup показывает Smart Progress");
  assert.equal(await page.locator("#hero-player [data-fake-youtube]").evaluate((node) => getComputedStyle(node).pointerEvents), "none", "YouTube iframe не получает hover");
  assert.equal(await page.locator("#hero-player .yvsl-captions").isVisible(), true, "кнопка CC появляется для видео с дорожками");
  assert.equal(await page.locator("#hero-player .yvsl-captions").getAttribute("aria-pressed"), "false", "субтитры hero доступны, но выключены");
  assert.equal(await page.locator("#example-player .yvsl-captions").getAttribute("aria-pressed"), "false", "субтитры основного примера доступны, но выключены");
  assert.equal(await page.locator("#example-player .yvsl-root").evaluate((node) => node.classList.contains("yvsl-root--clean-youtube")), true, "основной пример использует clean-режим");
  assert.equal((await page.locator("body").innerText()).includes("Это настоящий плеер, а не картинка"), false, "нежелательная подпись удалена");
  assert.equal((await page.locator("body").innerText()).includes("Живые примеры"), false, "калька про живые примеры удалена");
  assert.equal((await page.locator("body").innerText()).includes("медиавремени"), false, "непонятный термин удалён");
  assert.equal((await page.locator("body").innerText()).includes("Без лишней платформы вокруг"), false, "неестественный подзаголовок удалён");
  assert.equal((await page.locator("body").innerText()).includes("__VERSION__"), false, "версия подставлена при сборке");
  assert.equal((await page.locator("body").innerText()).includes("__SIZE__"), false, "размер minified-сборки подставлен при сборке");
  assert.equal(await page.locator("#example-forward, #example-back, #example-result, #event-log, #event-count").count(), 0, "тестовые кнопки и JSON-лог удалены");
  assert.match(await page.locator("#install-code").textContent(), /yellow-vsl@v1\.7\.2/);
  assert.match(await page.locator("#modes-code").textContent(), /\[5, 50\].*\[30, 70\].*\[50, 90\]/s);
  assert.match(await page.locator("#cta-code").textContent(), /background: "#ff3b30"/);
  assert.match(await page.locator("#cta-code").textContent(), /reveal: "#offer"/);
  assert.match(await page.locator("#cta-code").textContent(), /url: "https:\/\/example\.com"/);
  assert.match(await page.locator("#cta-code").textContent(), /target: "_blank"/);
  assert.match(await page.locator("#cta-code").textContent(), /reveals: \[\{/);
  assert.match(await page.locator("#cta-code").textContent(), /selector: "#order-form"/);
  assert.match(await page.locator("#captions-code").textContent(), /youtubeUi: "clean"/);
  assert.match(await page.locator("#captions-code").textContent(), /captions: true/);
  assert.match(await page.locator("#captions-code").textContent(), /enabled: false/);
  assert.match(await page.locator("#captions-code").textContent(), /language: "ru"/);
  assert.match(await page.locator("#docs-link").getAttribute("href"), /yellow-vsl#configuration-reference$/);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), "https://yellowvsl.pages.dev/og.png");

  await page.evaluate(() => {
    const player = window.yellowVslSite.fastProgressPlayer;
    player.adapter.player.time = 2.4;
    player.timeline.maxWatched = 2.4;
    player._tick();
  });
  assert.ok(Number(await page.locator("#fast-progress-player .yvsl-progress").inputValue()) >= 500, "быстрая шкала заполняется примерно наполовину за первые секунды");

  await page.evaluate(() => {
    const player = window.yellowVslSite.externalCtaPlayer;
    player.adapter.player.time = 3.1;
    player.timeline.maxWatched = 3.1;
    player._tick();
  });
  const externalCta = page.locator("#external-cta-player .yvsl-cta");
  assert.equal(await externalCta.isVisible(), true, "внешняя CTA появляется по таймеру");
  assert.equal(await externalCta.getAttribute("href"), "https://yellowweb.top/", "CTA ведёт на yellowweb.top");
  assert.equal(await externalCta.getAttribute("target"), "_blank", "CTA открывает сайт в новой вкладке");
  assert.equal(await externalCta.getAttribute("rel"), "noopener noreferrer", "внешняя вкладка открывается безопасно");

  await page.evaluate(() => {
    const player = window.yellowVslSite.examplePlayer;
    player.adapter.player.time = 2.5;
    player.timeline.maxWatched = 2.5;
    player._tick();
  });
  assert.equal(await page.locator("#example-player .yvsl-hook").isVisible(), true, "подсказка появляется по времени");
  assert.equal(await page.locator("#example-player .yvsl-hook").evaluate((node) => getComputedStyle(node).color), "rgb(255, 255, 255)", "текст подсказки контрастный");
  assert.equal(await page.locator("#example-player .yvsl-hook").evaluate((node) => getComputedStyle(node).backgroundColor), "rgba(8, 10, 12, 0.92)", "у подсказки контрастный фон");

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
  assert.equal(await page.locator("#example-offer").isVisible(), false, "появление CTA само не раскрывает оффер");
  await page.locator("#example-player .yvsl-cta").click();
  assert.equal(await page.locator("#example-offer").isVisible(), true, "CTA раскрывает оффер после клика");
  assert.equal(await page.evaluate(() => window.yellowVslSite.fragmentPlayer.options.aspectRatioValue), 16 / 9, "фрагмент больше не притворяется вертикальным видео");

  await page.click("#example-unmute");
  assert.equal(await page.locator("#example-unmute").isHidden(), true, "одноразовая кнопка включения звука исчезает");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#open-popup");
  assert.equal(await page.locator(".yvsl-popup-backdrop").isVisible(), true, "popup открыт");
  assert.equal(await page.locator("[data-fake-youtube]").count(), 6, "popup повторно не создаёт YouTube iframe");
  assert.equal(await page.locator(".yvsl-popup-panel .yvsl-progress").isVisible(), true, "у popup есть таймлайн");
  assert.equal(await page.locator(".yvsl-popup-panel .yvsl-captions").isVisible(), true, "у popup есть кнопка субтитров");
  assert.equal(await page.locator(".yvsl-popup-backdrop").evaluate((node) => getComputedStyle(node).padding), "0px", "мобильный popup занимает весь экран без белых полей");
  assert.equal(await page.locator(".yvsl-popup-panel .yvsl-root").evaluate((node) => getComputedStyle(node).borderRadius), "0px", "у мобильного popup нет белых углов");
  await page.click(".yvsl-popup-close");
  assert.equal(await page.locator(".yvsl-popup-backdrop").isHidden(), true, "popup закрыт");

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
  await enPage.goto(`${server.origin}/`, { waitUntil: "domcontentloaded" });
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
