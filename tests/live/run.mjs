import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { startStaticServer } from "../helpers/server.mjs";
import { inspectVisibleYouTube } from "../helpers/loop-inspection.mjs";

const engines = { chromium, firefox, webkit };
const server = await startStaticServer();
const results = [];
const loopCycles = Number(process.env.LIVE_LOOP_CYCLES || 3);
assert.ok(Number.isInteger(loopCycles) && loopCycles >= 3);

try {
  for (const [name, engine] of Object.entries(engines)) {
    if (process.env.LIVE_ENGINE && name !== process.env.LIVE_ENGINE) continue;
    const browser = await engine.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => { errors.push(error.message); console.error(`${name}: ${error.stack}`); });
    await page.goto(`${server.origin}/tests/live/fixture.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      window.livePlayer = window.YellowVSL.autoInit()[0];
      window.livePopupPlayer = window.YellowVSL.create("#live-popup", {
        video: "Y7jHPB7FjhM",
        popup: { trigger: "#live-popup-trigger", preload: true },
        playback: { autoplay: false, resume: false },
        captions: { enabled: false, language: "ru" }
      });
      window.liveLoopPlayer = window.YellowVSL.create("#live-loop", {
        video: "Y7jHPB7FjhM",
        playback: { autoplay: false, resume: false, start: 10, end: 16, loop: true, rate: 1.5 },
        stage: { revealDelay: 0 },
        controls: { captions: false }
      });
      await Promise.all([window.livePlayer.ready, window.livePopupPlayer.ready, window.liveLoopPlayer.ready]);
    }, { timeout: 30000 });
    await page.waitForSelector("#live iframe[src*='youtube.com/embed']", { timeout: 30000 });
    const state = await page.evaluate(() => window.livePlayer.getState());
    assert.equal(state.ready, true, `${name}: ready`);
    assert.ok(state.duration > 0, `${name}: duration received`);
    await page.locator("#live .yvsl-play").click();
    await page.waitForFunction(() => window.livePlayer.getState().playerState === 1, { timeout: 15000 });
    await page.waitForFunction(() => window.livePlayer.getState().currentTime > 0, { timeout: 15000 });
    await page.waitForFunction(() => window.livePlayer.captions.tracks.length > 0, { timeout: 15000 });
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
    await page.waitForFunction(() => window.livePopupPlayer.captions.tracks.length > 0, { timeout: 15000 });
    assert.equal(await page.locator(".yvsl-popup-panel .yvsl-captions").isVisible(), true, `${name}: popup CC button appears for the same video`);
    assert.equal(await page.locator(".yvsl-popup-panel .yvsl-progress").isVisible(), true, `${name}: popup timeline remains visible with CC control`);
    await page.locator(".yvsl-popup-close").click();

    await page.locator("#live-loop .yvsl-play").click();
    await page.waitForFunction(() => window.liveLoopPlayer.getState().playerState === 1, { timeout: 15000 });
    await page.waitForFunction(() => window.liveLoopPlayer.getState().currentTime > 0.5, { timeout: 15000 });
    await page.evaluate(() => {
      window.liveLoopCompletions = 0;
      window.liveLoopLoadingObserved = false;
      window.liveLoopLoadingEvents = [];
      const player = window.liveLoopPlayer;
      const inspect = () => {
        if (player.dom.play.classList.contains("yvsl-is-loading") || player.dom.posterPlay.classList.contains("yvsl-is-loading")) {
          window.liveLoopLoadingObserved = true;
          window.liveLoopLoadingEvents.push({
            completions: window.liveLoopCompletions,
            currentTime: player.getState().currentTime,
            playerState: player.getState().playerState,
            loopRestarting: player.loop.restarting
          });
        }
      };
      player.dom.root.addEventListener("yellowvsl:complete", () => { window.liveLoopCompletions += 1; });
      window.liveLoopObserver = new MutationObserver(inspect);
      window.liveLoopObserver.observe(player.dom.play, { attributes: true, attributeFilter: ["class"] });
      window.liveLoopObserver.observe(player.dom.posterPlay, { attributes: true, attributeFilter: ["class"] });
      inspect();
    });
    const nativeSpinnerEvents = [];
    let stableSamples = 0;
    const loopDeadline = Date.now() + Math.max(30000, loopCycles * 7000);
    while (Date.now() < loopDeadline) {
      const loopSnapshot = await page.evaluate(() => ({
        completions: window.liveLoopCompletions,
        currentTime: window.liveLoopPlayer.getState().currentTime,
        playerState: window.liveLoopPlayer.getState().playerState,
        mirrorVisible: window.liveLoopPlayer.dom.loopMirror.classList.contains("yvsl-loop-mirror--visible"),
        transitionActive: window.liveLoopPlayer.loop.active,
        mirrorReady: window.liveLoopPlayer.loop.ready,
        mirrorPreparing: window.liveLoopPlayer.loop.preparing
      }));
      if (loopSnapshot.completions >= loopCycles) break;
      const presentation = await inspectVisibleYouTube(page, "#live-loop");
      if (presentation.stable) stableSamples++;
      if (presentation.stable && (presentation.bufferingMode || presentation.spinnerVisible)) {
        nativeSpinnerEvents.push({ ...loopSnapshot, ...presentation });
      }
      await page.waitForTimeout(50);
    }
    const liveLoop = await page.evaluate(() => {
      window.liveLoopObserver.disconnect();
      const state = window.liveLoopPlayer.getState();
      return {
        completions: window.liveLoopCompletions,
        loadingObserved: window.liveLoopLoadingObserved,
        loadingEvents: window.liveLoopLoadingEvents,
        playing: state.playerState === 1 || window.liveLoopPlayer.loop.restarting,
        currentTime: state.currentTime
      };
    });
    liveLoop.nativeSpinnerEvents = nativeSpinnerEvents;
    assert.ok(stableSamples >= 10, `${name}: meaningful sampling of the presented frames`);
    assert.ok(liveLoop.completions >= loopCycles, `${name}: real YouTube clip completes ${loopCycles} loop cycles (${JSON.stringify(liveLoop)})`);
    assert.equal(liveLoop.loadingObserved, false, `${name}: real YouTube loop restarts never expose loading UI (${JSON.stringify(liveLoop.loadingEvents)})`);
    assert.deepEqual(liveLoop.nativeSpinnerEvents, [], `${name}: real YouTube loop never exposes its native spinner`);
    assert.equal(liveLoop.playing, true, `${name}: real YouTube loop keeps playing after three cycles`);
    assert.deepEqual(errors, [], `${name}: no page errors`);
    results.push(`${name}: captions ready and ${loopCycles} seamless YouTube loops completed, duration ${Math.round(state.duration)}s`);
    await browser.close();
  }
} finally {
  await server.close();
}

console.log(results.join("\n"));
