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
      window.livePopupPlayer = window.YellowVSL.create("#live-popup", {
        video: "Y7jHPB7FjhM",
        popup: { trigger: "#live-popup-trigger", preload: true },
        playback: { autoplay: false, resume: false },
        captions: { enabled: false, language: "ru" }
      });
      await Promise.all([window.livePlayer.ready, window.livePopupPlayer.ready]);
    }, { timeout: 30000 });
    await page.waitForSelector("#live iframe[src*='youtube.com/embed']", { timeout: 30000 });
    const state = await page.evaluate(() => window.livePlayer.getState());
    assert.equal(state.ready, true, `${name}: ready`);
    assert.ok(state.duration > 0, `${name}: duration received`);
    await page.locator("#live .yvsl-play").click();
    await page.waitForFunction(() => window.livePlayer.getState().playerState === 1, { timeout: 15000 });
    await page.waitForFunction(() => window.livePlayer.getState().currentTime > 0, { timeout: 15000 });
    await page.waitForFunction(() => window.livePlayer.captionTracks.length > 0, { timeout: 15000 });
    assert.equal(await page.locator("#live .yvsl-captions").isVisible(), true, `${name}: CC button appears for captioned video`);
    const cleanStageBox = await page.locator("#live .yvsl-stage").boundingBox();
    const cleanIframeBox = await page.locator("#live iframe").boundingBox();
    assert.ok(cleanStageBox && cleanIframeBox && cleanIframeBox.height >= cleanStageBox.height + 1900, `${name}: captions-off mode crops the oversized YouTube frame`);
    const beforeCaptions = await page.evaluate(() => window.livePlayer.getState());
    await page.locator("#live .yvsl-captions").click();
    const enabledCaptions = await page.evaluate(() => window.livePlayer.getState());
    assert.equal(enabledCaptions.captions, true, `${name}: CC button enables captions`);
    assert.equal(enabledCaptions.captionLanguage, "ru", `${name}: configured Russian track selected`);
    assert.equal(enabledCaptions.playerState, beforeCaptions.playerState, `${name}: CC does not change play/pause`);
    assert.ok(enabledCaptions.currentTime >= beforeCaptions.currentTime, `${name}: CC does not seek to the beginning`);
    const captionSegment = page.frameLocator("#live iframe").locator(".ytp-caption-segment").first();
    await captionSegment.waitFor({ state: "visible", timeout: 15000 });
    const captionBox = await captionSegment.boundingBox();
    const stageBox = await page.locator("#live .yvsl-stage").boundingBox();
    const iframeBox = await page.locator("#live iframe").boundingBox();
    assert.ok(captionBox && stageBox && iframeBox, `${name}: caption and player geometry available`);
    assert.ok(captionBox.y >= stageBox.y && captionBox.y + captionBox.height <= stageBox.y + stageBox.height, `${name}: native captions are visible inside the video frame`);
    assert.ok(Math.abs(iframeBox.y - stageBox.y) <= 1 && Math.abs(iframeBox.height - stageBox.height) <= 1, `${name}: YouTube iframe matches the visible frame`);
    await page.locator("#live .yvsl-captions").click();
    assert.equal(await page.evaluate(() => window.livePlayer.getState().captions), false, `${name}: second CC click disables captions`);
    assert.equal(await page.locator("#live .yvsl-root").evaluate((node) => node.classList.contains("yvsl-root--clean-youtube")), true, `${name}: captions off restores clean mode`);
    await page.locator("#live-popup-trigger").click();
    await page.waitForFunction(() => window.livePopupPlayer.captionTracks.length > 0, { timeout: 15000 });
    assert.equal(await page.locator(".yvsl-popup-panel .yvsl-captions").isVisible(), true, `${name}: popup CC button appears for the same video`);
    assert.equal(await page.locator(".yvsl-popup-panel .yvsl-progress").isVisible(), true, `${name}: popup timeline remains visible with CC control`);
    await page.locator(".yvsl-popup-close").click();
    assert.deepEqual(errors, [], `${name}: no page errors`);
    results.push(`${name}: inline and popup captions ready, duration ${Math.round(state.duration)}s`);
    await browser.close();
  }
} finally {
  await server.close();
}

console.log(results.join("\n"));
