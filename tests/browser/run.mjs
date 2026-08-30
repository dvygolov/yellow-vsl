import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { startStaticServer } from "../helpers/server.mjs";

const engines = { chromium, firefox, webkit };
const server = await startStaticServer();
const fakeYouTube = resolve("tests/browser/fake-youtube.js");
const results = [];

try {
  for (const [name, engine] of Object.entries(engines)) {
    const browser = await engine.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.addInitScript({ path: fakeYouTube });
    await page.goto(`${server.origin}/tests/browser/fixture.html`, { waitUntil: "domcontentloaded" });

    await page.evaluate(async () => {
      window.mainPlayer = window.YellowVSL.autoInit()[0];
      await window.mainPlayer.ready;
    });
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);

    const initial = await page.evaluate(() => window.mainPlayer.getState());
    assert.equal(initial.ready, true, `${name}: ready`);
    assert.equal(initial.playerState, 1, `${name}: Smart Autoplay`);
    assert.equal(initial.muted, true, `${name}: muted autoplay`);
    assert.equal(await page.locator(".yvsl-progress").first().isVisible(), true, `${name}: progress visible`);
    assert.equal(await page.locator(".yvsl-message").first().isVisible(), true, `${name}: unmute prompt`);
    assert.equal(await page.locator("#main .yvsl-poster").isHidden(), true, `${name}: poster hidden while playing`);
    assert.equal(await page.locator("#main [data-fake-youtube]").evaluate((node) => getComputedStyle(node).pointerEvents), "none", `${name}: YouTube surface ignores hover`);

    const captionsToggle = await page.evaluate(() => {
      const player = window.mainPlayer;
      const before = player.getState();
      player.dom.captions.click();
      const enabled = player.getState();
      const selectedTrack = player.adapter.player.captionTrack;
      player.dom.captions.click();
      const disabled = player.getState();
      return { before, enabled, selectedTrack, disabled };
    });
    assert.equal(await page.locator("#main .yvsl-captions").isVisible(), true, `${name}: captions button appears when tracks exist`);
    assert.equal(captionsToggle.before.captions, false, `${name}: captions start disabled in the fake player`);
    assert.equal(captionsToggle.enabled.captions, true, `${name}: captions button enables captions`);
    assert.equal(captionsToggle.enabled.playerState, captionsToggle.before.playerState, `${name}: enabling captions does not change play/pause`);
    assert.equal(captionsToggle.selectedTrack.languageCode, "en", `${name}: captions button selects the first available track`);
    assert.equal(captionsToggle.disabled.captions, false, `${name}: second captions click disables captions`);
    assert.equal(captionsToggle.disabled.playerState, captionsToggle.before.playerState, `${name}: disabling captions does not change play/pause`);

    const volumeToggle = await page.evaluate(() => {
      const player = window.mainPlayer;
      player.unmute(false);
      player.timeline.current = 20;
      player.timeline.maxWatched = 20;
      player.adapter.player.time = 20;
      let seekCalls = 0;
      const originalSeekTo = player.adapter.seekTo;
      player.adapter.seekTo = (...args) => {
        seekCalls += 1;
        return originalSeekTo.apply(player.adapter, args);
      };
      player.dom.volume.click();
      const afterMute = player.getState();
      player.dom.volume.click();
      const afterUnmute = player.getState();
      player.adapter.seekTo = originalSeekTo;
      return { seekCalls, afterMute, afterUnmute };
    });
    assert.equal(volumeToggle.afterMute.muted, true, `${name}: volume button mutes without pausing`);
    assert.equal(volumeToggle.afterMute.playerState, 1, `${name}: playback continues after mute`);
    assert.equal(volumeToggle.afterUnmute.muted, false, `${name}: second volume click unmutes`);
    assert.equal(volumeToggle.afterUnmute.playerState, 1, `${name}: playback continues after unmute`);
    assert.equal(volumeToggle.seekCalls, 0, `${name}: volume toggle never seeks to the beginning`);
    assert.ok(volumeToggle.afterUnmute.currentTime >= 20, `${name}: volume toggle preserves position`);

    const pausedVolumeToggle = await page.evaluate(() => {
      const player = window.mainPlayer;
      player.pause();
      player.mute();
      let playCalls = 0;
      const originalPlay = player.adapter.play;
      player.adapter.play = (...args) => {
        playCalls += 1;
        return originalPlay.apply(player.adapter, args);
      };
      const before = player.getState();
      player.dom.volume.click();
      const after = player.getState();
      player.adapter.play = originalPlay;
      return { before, after, playCalls };
    });
    assert.equal(pausedVolumeToggle.before.playerState, 2, `${name}: paused volume test starts paused`);
    assert.equal(pausedVolumeToggle.after.muted, false, `${name}: paused player can be unmuted`);
    assert.equal(pausedVolumeToggle.after.playerState, 2, `${name}: unmute preserves paused state`);
    assert.equal(pausedVolumeToggle.playCalls, 0, `${name}: unmute never calls play`);
    await page.evaluate(() => window.mainPlayer.play());
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);

    await page.locator("#main .yvsl-stage-interaction").click({ position: { x: 10, y: 10 } });
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 2);
    assert.equal(await page.locator("#main .yvsl-poster").isVisible(), true, `${name}: own poster shown while paused`);
    await page.locator("#main .yvsl-stage-interaction").click({ position: { x: 10, y: 10 } });
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);

    const blockedTimelineClick = await page.evaluate(() => {
      const player = window.mainPlayer;
      player.timeline.current = 2;
      player.timeline.maxWatched = 2;
      player.stageRevealed = true;
      player._updateUi();
      let seekCalls = 0;
      const originalSeekTo = player.adapter.seekTo;
      player.adapter.seekTo = () => { seekCalls += 1; };
      player.dom.progress.value = "950";
      player.dom.progress.dispatchEvent(new Event("input", { bubbles: true }));
      const blocked = {
        seekCalls,
        currentTime: player.getState().currentTime,
        progressValue: Number(player.dom.progress.value)
      };
      player._onStateChange(3);
      blocked.posterHiddenDuringBuffering = player.dom.poster.hidden;
      player.adapter.seekTo = originalSeekTo;
      player._onStateChange(1);
      return blocked;
    });
    assert.equal(blockedTimelineClick.seekCalls, 0, `${name}: blocked timeline click does not call YouTube seek`);
    assert.equal(blockedTimelineClick.currentTime, 2, `${name}: blocked timeline click keeps current time`);
    assert.notEqual(blockedTimelineClick.progressValue, 950, `${name}: blocked timeline click restores progress thumb`);
    assert.equal(blockedTimelineClick.posterHiddenDuringBuffering, true, `${name}: buffering does not flash own poster`);

    const warmup = await page.evaluate(async () => {
      const mount = document.createElement("div");
      mount.id = "warmup";
      document.body.append(mount);
      window.warmupPlayer = window.YellowVSL.create(mount, {
        video: "M7lc1UVf-VE",
        playback: { autoplay: false, resume: false },
        stage: { revealDelay: 120 }
      });
      await window.warmupPlayer.ready;
      window.warmupPlayer.play();
      return {
        posterVisible: !mount.querySelector(".yvsl-poster").hidden,
        muted: window.warmupPlayer.adapter.isMuted()
      };
    });
    assert.equal(warmup.posterVisible, true, `${name}: own poster covers native startup UI`);
    assert.equal(warmup.muted, true, `${name}: warmup is muted`);
    await page.waitForFunction(() => document.querySelector("#warmup .yvsl-poster")?.hidden === true);
    assert.equal(await page.evaluate(() => window.warmupPlayer.getState().muted), false, `${name}: audio restored after warmup`);
    await page.evaluate(() => window.warmupPlayer.destroy());

    const delayedMuteIntent = await page.evaluate(async () => {
      const mount = document.createElement("div");
      mount.id = "delayed-mute";
      document.body.append(mount);
      const player = window.YellowVSL.create(mount, {
        video: "M7lc1UVf-VE",
        playback: { autoplay: false, resume: false },
        stage: { revealDelay: 120 }
      });
      await player.ready;
      player.pause();
      const applyMute = player.adapter.mute.bind(player.adapter);
      let unmuteCalls = 0;
      const applyUnmute = player.adapter.unmute.bind(player.adapter);
      player.adapter.mute = () => window.setTimeout(applyMute, 80);
      player.adapter.unmute = () => {
        unmuteCalls += 1;
        applyUnmute();
      };
      player.mute();
      const mutedImmediately = player.getState().muted;
      player.play();
      await new Promise((resolveWait) => window.setTimeout(resolveWait, 220));
      const state = player.getState();
      player.destroy();
      return { mutedImmediately, state, unmuteCalls };
    });
    assert.equal(delayedMuteIntent.mutedImmediately, true, `${name}: mute intent is immediate before YouTube confirms it`);
    assert.equal(delayedMuteIntent.state.playerState, 1, `${name}: delayed mute test is playing`);
    assert.equal(delayedMuteIntent.state.muted, true, `${name}: play preserves explicit mute intent`);
    assert.equal(delayedMuteIntent.unmuteCalls, 0, `${name}: warmup never cancels explicit mute`);
    await page.evaluate(() => window.mainPlayer.play());
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);

    await page.emulateMedia({ reducedMotion: "reduce" });
    const loadingIndicator = await page.evaluate(async () => {
      const mount = document.createElement("div");
      mount.id = "loading-indicator";
      document.body.append(mount);
      const player = window.YellowVSL.create(mount, {
        video: "M7lc1UVf-VE",
        playback: { autoplay: false, resume: false }
      });
      await player.ready;
      player.adapter.play = () => {};
      player.play();
      const spinnerBefore = getComputedStyle(player.dom.play, "::after");
      const requested = {
        active: player.dom.play.classList.contains("yvsl-is-loading"),
        label: player.dom.play.getAttribute("aria-label"),
        display: spinnerBefore.display,
        width: spinnerBefore.width,
        height: spinnerBefore.height,
        animationName: spinnerBefore.animationName,
        transformBefore: spinnerBefore.transform
      };
      await new Promise((resolveWait) => window.setTimeout(resolveWait, 220));
      requested.transformAfter = getComputedStyle(player.dom.play, "::after").transform;
      player._onStateChange(3);
      const buffering = player.dom.play.classList.contains("yvsl-is-loading");
      player._onStateChange(1);
      const playing = player.dom.play.classList.contains("yvsl-is-loading");
      player.destroy();
      return { requested, buffering, playing };
    });
    assert.equal(loadingIndicator.requested.active, true, `${name}: play request shows loader`);
    assert.match(loadingIndicator.requested.label, /загруз/i, `${name}: loader has an accessible label`);
    assert.equal(loadingIndicator.requested.display, "block", `${name}: spinner is a transformable block`);
    assert.equal(loadingIndicator.requested.width, "20px", `${name}: spinner has a fixed width`);
    assert.equal(loadingIndicator.requested.height, "20px", `${name}: spinner has a fixed height`);
    assert.equal(loadingIndicator.requested.animationName, "yvsl-spin", `${name}: spinner animation is attached`);
    assert.notEqual(loadingIndicator.requested.transformAfter, loadingIndicator.requested.transformBefore, `${name}: spinner angle changes over time`);
    assert.equal(loadingIndicator.buffering, true, `${name}: buffering keeps loader visible`);
    assert.equal(loadingIndicator.playing, false, `${name}: playing hides loader`);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => window.mainPlayer.play());
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);

    const fullscreenButton = page.locator("#main .yvsl-fullscreen");
    if (await fullscreenButton.isVisible()) {
      await fullscreenButton.click();
      await page.waitForFunction(() => document.fullscreenElement?.classList.contains("yvsl-root"));
      assert.match(await fullscreenButton.getAttribute("aria-label"), /выйти/i, `${name}: fullscreen enters`);
      assert.equal(await page.locator("#main .yvsl-root--sticky").count(), 0, `${name}: fullscreen suppresses sticky mode`);
      await page.waitForFunction(() => document.querySelector("#main .yvsl-root")?.classList.contains("yvsl-controls-hidden"), { timeout: 4000 });
      assert.equal(await page.evaluate(() => window.mainPlayer.getState().playerState), 1, `${name}: fullscreen controls hide while playback continues`);
      await page.locator("#main .yvsl-stage-interaction").click();
      assert.equal(await page.locator("#main .yvsl-root").evaluate((node) => node.classList.contains("yvsl-controls-hidden")), false, `${name}: fullscreen tap reveals controls`);
      assert.equal(await page.evaluate(() => window.mainPlayer.getState().playerState), 1, `${name}: revealing fullscreen controls does not pause playback`);
      await page.evaluate(() => document.exitFullscreen());
      await page.waitForFunction(() => !document.fullscreenElement);
    }

    await page.evaluate(() => window.mainPlayer.play());
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);
    await page.waitForFunction(() => window.mainPlayer.getState().maxWatched > 0.5);
    const seek = await page.evaluate(() => {
      const beforeState = window.mainPlayer.getState();
      const before = beforeState.maxWatched;
      const forward = window.mainPlayer.seek(before + 40);
      const backward = window.mainPlayer.seek(before / 2);
      return { before, currentBefore: beforeState.currentTime, forward, backward, state: window.mainPlayer.getState() };
    });
    assert.ok(Math.abs(seek.forward - seek.currentBefore) < 0.01, `${name}: forward seek is a no-op`);
    assert.ok(Math.abs(seek.backward - seek.before / 2) < 0.01, `${name}: backward seek allowed`);
    assert.equal(await page.evaluate(() => window.YellowVSL.interpolateProgress(0.1)), 0.3, `${name}: smart curve`);

    const advanced = await page.evaluate(async () => {
      window.eventNames = [];
      window.autoRevealScrolled = false;
      document.querySelector("#auto-offer").scrollIntoView = () => { window.autoRevealScrolled = true; };
      document.addEventListener("yellowvsl:play", () => window.eventNames.push("play"));
      window.advancedPlayer = window.YellowVSL.create("#advanced", {
        video: "M7lc1UVf-VE",
        playback: { autoplay: false },
        controls: { captions: false },
        captions: { enabled: true, language: "ru" },
        stage: { revealDelay: 0 },
        hooks: [{ start: 0.2, end: 2, text: "Hook", placement: "above" }],
        ctas: [{ id: "offer", start: 0.5, text: "CTA", reveal: "#offer", placement: "bottom-right", background: "#123456", color: "#ffffff", persist: true }],
        reveals: [{ id: "automatic-offer", start: 0.75, selector: "#auto-offer", persist: true }]
      });
      await window.advancedPlayer.ready;
      window.advancedPlayer.play();
      return window.advancedPlayer.getState();
    });
    assert.equal(advanced.ready, true, `${name}: advanced ready`);
    assert.equal(advanced.captions, true, `${name}: captions can start enabled`);
    assert.equal(advanced.captionLanguage, "ru", `${name}: configured caption language is selected`);
    assert.equal(await page.locator("#advanced .yvsl-captions").isHidden(), true, `${name}: captions can stay enabled with no CC button`);
    assert.equal(await page.evaluate(() => window.advancedPlayer.adapter.player.captionTrack.languageCode), "ru", `${name}: hidden control still selects the caption track`);
    await page.waitForFunction(() => window.advancedPlayer.getState().currentTime > 0.9);
    assert.equal(await page.locator("#advanced .yvsl-hook").isVisible(), true, `${name}: hook timing`);
    assert.equal(await page.locator("#advanced .yvsl-cta").isVisible(), true, `${name}: CTA timing`);
    assert.equal(await page.locator("#advanced .yvsl-cta").evaluate((node) => node.parentElement.classList.contains("yvsl-zone--bottom-right")), true, `${name}: CTA corner placement`);
    assert.equal(await page.locator("#advanced .yvsl-cta").evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(18, 52, 86)", `${name}: CTA background color`);
    assert.equal(await page.locator("#advanced .yvsl-cta").evaluate((node) => getComputedStyle(node).color), "rgb(255, 255, 255)", `${name}: CTA text color`);
    assert.equal(await page.locator("#offer").isVisible(), false, `${name}: showing a CTA does not reveal its target`);
    assert.equal(await page.locator("#auto-offer").isVisible(), true, `${name}: timed reveal opens its target automatically`);
    assert.equal(await page.evaluate(() => window.autoRevealScrolled), false, `${name}: automatic reveal does not scroll by default`);
    await page.evaluate(() => {
      window.revealScroll = null;
      document.querySelector("#offer").scrollIntoView = (options) => { window.revealScroll = options; };
    });
    await page.locator("#advanced .yvsl-cta").click();
    assert.equal(await page.locator("#offer").isVisible(), true, `${name}: CTA reveals its target only after click`);
    assert.deepEqual(await page.evaluate(() => window.revealScroll), { behavior: "smooth", block: "start" }, `${name}: CTA scrolls to its revealed block`);
    assert.ok((await page.evaluate(() => window.eventNames)).includes("play"), `${name}: bubbling events`);

    await page.evaluate(async () => {
      window.secondPlayer = window.YellowVSL.create("#second", {
        video: "M7lc1UVf-VE",
        playback: { autoplay: false }
      });
      await window.secondPlayer.ready;
      window.advancedPlayer.play();
      window.secondPlayer.play();
    });
    await page.waitForFunction(() => window.secondPlayer.getState().playerState === 1);
    assert.notEqual(await page.evaluate(() => window.advancedPlayer.getState().playerState), 1, `${name}: only one player plays`);

    await page.evaluate(async () => {
      window.popupPlayer = window.YellowVSL.create("#popup", {
        video: "M7lc1UVf-VE",
        playback: { autoplay: false },
        popup: { trigger: "#open-popup" }
      });
      await window.popupPlayer.ready;
    });
    assert.equal(await page.evaluate(() => window.popupPlayer.adapter), null, `${name}: hidden popup defers YouTube mount`);
    await page.click("#open-popup");
    assert.equal(await page.locator(".yvsl-popup-backdrop").isVisible(), true, `${name}: popup opens`);
    assert.notEqual(await page.evaluate(() => window.secondPlayer.getState().playerState), 1, `${name}: popup pauses other players`);
    const popupLoading = await page.evaluate(() => {
      const player = window.popupPlayer;
      player.adapter.play = () => {
        player._onStateChange(3);
        window.setTimeout(() => { player.adapter.player.time += 0.12; }, 70);
        window.setTimeout(() => { player.adapter.player.time += 0.12; }, 150);
      };
      player.dom.play.click();
      const controlStyle = getComputedStyle(player.dom.play);
      const posterStyle = getComputedStyle(player.dom.posterPlay);
      const posterSpinnerStyle = getComputedStyle(player.dom.posterPlay, "::after");
      const stageRect = player.dom.stage.getBoundingClientRect();
      const posterRect = player.dom.posterPlay.getBoundingClientRect();
      return {
        controlLoading: player.dom.play.classList.contains("yvsl-is-loading"),
        posterLoading: player.dom.posterPlay.classList.contains("yvsl-is-loading"),
        controlPaddingLeft: controlStyle.paddingLeft,
        controlPaddingRight: controlStyle.paddingRight,
        controlJustify: controlStyle.justifyContent,
        controlAlign: controlStyle.alignItems,
        posterTransform: posterStyle.transform,
        posterSpinnerPosition: posterSpinnerStyle.position,
        posterSpinnerTop: posterSpinnerStyle.top,
        posterSpinnerLeft: posterSpinnerStyle.left,
        posterSpinnerAnimation: posterSpinnerStyle.animationName,
        posterWidth: posterRect.width,
        posterHeight: posterRect.height,
        posterCenterDeltaX: Math.abs((posterRect.left + posterRect.width / 2) - (stageRect.left + stageRect.width / 2)),
        posterCenterDeltaY: Math.abs((posterRect.top + posterRect.height / 2) - (stageRect.top + stageRect.height / 2))
      };
    });
    assert.equal(popupLoading.controlLoading, true, `${name}: popup control shows loading while YouTube buffers`);
    assert.equal(popupLoading.posterLoading, true, `${name}: popup poster shows loading while YouTube buffers`);
    assert.equal(popupLoading.controlPaddingLeft, "0px", `${name}: loading control has symmetric left padding`);
    assert.equal(popupLoading.controlPaddingRight, "0px", `${name}: loading control has symmetric right padding`);
    assert.equal(popupLoading.controlJustify, "center", `${name}: loading control is horizontally centered`);
    assert.equal(popupLoading.controlAlign, "center", `${name}: loading control is vertically centered`);
    assert.ok(popupLoading.posterCenterDeltaX <= 1, `${name}: poster loader is horizontally centered`);
    assert.ok(popupLoading.posterCenterDeltaY <= 1, `${name}: poster loader is vertically centered`);
    assert.match(popupLoading.posterTransform, /matrix\(1, 0, 0, 1, -/i, `${name}: poster loader offsets itself by half its size`);
    assert.equal(popupLoading.posterSpinnerPosition, "absolute", `${name}: poster spinner is positioned independently of text flow`);
    assert.ok(Math.abs(Number.parseFloat(popupLoading.posterSpinnerTop) - popupLoading.posterHeight / 2) <= 1, `${name}: poster spinner origin is vertically centered`);
    assert.ok(Math.abs(Number.parseFloat(popupLoading.posterSpinnerLeft) - popupLoading.posterWidth / 2) <= 1, `${name}: poster spinner origin is horizontally centered`);
    assert.equal(popupLoading.posterSpinnerAnimation, "yvsl-spin-centered", `${name}: poster spinner keeps its centering transform while rotating`);
    await page.waitForFunction(() => window.popupPlayer.getState().playerState === 1);
    assert.equal(await page.locator(".yvsl-popup-panel .yvsl-play").evaluate((node) => node.classList.contains("yvsl-is-loading")), false, `${name}: popup control stops loading when media time advances`);
    assert.equal(await page.locator(".yvsl-popup-panel .yvsl-poster").isHidden(), true, `${name}: popup poster hides when audio and media time start`);
    assert.match(await page.locator(".yvsl-popup-panel .yvsl-play").getAttribute("aria-label"), /пауз/i, `${name}: popup control switches to pause when media time advances`);
    assert.equal(await page.evaluate(() => window.popupPlayer.getState().ready), true, `${name}: popup mounts YouTube while visible`);
    await page.click(".yvsl-popup-close");
    assert.equal(await page.locator(".yvsl-popup-backdrop").isVisible(), false, `${name}: popup closes`);
    assert.notEqual(await page.evaluate(() => window.popupPlayer.getState().playerState), 1, `${name}: popup close pauses`);

    await page.evaluate(() => window.mainPlayer.play());
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForFunction(() => window.mainPlayer.getState().sticky === true);
    assert.equal(await page.locator("#main .yvsl-root--sticky").isVisible(), true, `${name}: sticky mode`);
    await page.locator("#main .yvsl-play").click();
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 2);
    assert.equal(await page.locator("#main .yvsl-root--sticky").isVisible(), true, `${name}: sticky stays visible while paused`);
    assert.equal(await page.locator("#main .yvsl-sticky-close").isVisible(), true, `${name}: paused sticky keeps its close button`);
    const pausedStickyClose = await page.locator("#main .yvsl-root").evaluate((root) => {
      const close = root.querySelector(".yvsl-sticky-close");
      const poster = root.querySelector(".yvsl-poster");
      const rect = close.getBoundingClientRect();
      return {
        closeZ: Number(getComputedStyle(close).zIndex),
        posterZ: Number(getComputedStyle(poster).zIndex),
        pointerEvents: getComputedStyle(close).pointerEvents,
        width: rect.width,
        height: rect.height
      };
    });
    assert.ok(pausedStickyClose.closeZ > pausedStickyClose.posterZ, `${name}: sticky close sits above the paused poster`);
    assert.notEqual(pausedStickyClose.pointerEvents, "none", `${name}: sticky close accepts clicks`);
    assert.ok(pausedStickyClose.width >= 44 && pausedStickyClose.height >= 44, `${name}: sticky close has a 44px hit target`);
    await page.locator("#main .yvsl-play").click();
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);
    assert.equal(await page.locator("#main .yvsl-root--sticky").isVisible(), true, `${name}: sticky resumes in place`);
    await page.locator("#main .yvsl-sticky-close").click();
    assert.notEqual(await page.evaluate(() => window.mainPlayer.getState().playerState), 1, `${name}: sticky close pauses`);

    await page.addInitScript(() => {
      localStorage.setItem("yellowvsl:v1:M7lc1UVf-VE:0:end", JSON.stringify({
        position: 8,
        maxWatched: 10,
        unlocks: [],
        activeAt: Date.now() + 1000,
        updatedAt: Date.now()
      }));
    });
    await page.reload();
    await page.evaluate(async () => {
      window.mainPlayer = window.YellowVSL.autoInit()[0];
      await window.mainPlayer.ready;
    });
    assert.equal(await page.locator("#main .yvsl-message").isVisible(), true, `${name}: resume prompt visible`);
    assert.match(await page.locator("#main .yvsl-message").textContent(), /уже начали смотреть/i, `${name}: resume copy`);
    await page.evaluate(() => window.mainPlayer.play());
    await page.waitForFunction(() => window.mainPlayer.getState().playerState === 1);
    assert.equal(await page.locator("#main .yvsl-message").isHidden(), true, `${name}: starting playback dismisses the resume prompt`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileLayout = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      rootWidth: document.querySelector("#main .yvsl-root").getBoundingClientRect().width,
      controlsOverflow: document.querySelector("#main .yvsl-controls").scrollWidth - document.querySelector("#main .yvsl-controls").clientWidth
    }));
    assert.ok(mobileLayout.pageWidth <= 390, `${name}: no mobile page overflow`);
    assert.ok(mobileLayout.rootWidth <= 390, `${name}: player fits mobile viewport`);
    assert.ok(mobileLayout.controlsOverflow <= 1, `${name}: controls fit mobile viewport`);

    const demoPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const demoErrors = [];
    demoPage.on("pageerror", (error) => demoErrors.push(error.message));
    await demoPage.addInitScript({ path: fakeYouTube });
    await demoPage.goto(`${server.origin}/demo/?autoplay=false`, { waitUntil: "domcontentloaded" });
    await demoPage.waitForFunction(() => document.documentElement.dataset.demoReady === "true");
    assert.equal(await demoPage.locator(".server-badge").isVisible(), true, `${name}: HTTP demo loaded`);

    await demoPage.click("#test-single");
    await demoPage.waitForFunction(() => ["pass", "fail"].includes(document.querySelector("#interaction-result")?.dataset.status));
    assert.equal(await demoPage.locator("#interaction-result").getAttribute("data-status"), "pass", `${name}: demo single-player check`);
    assert.match(await demoPage.locator("#interaction-result").textContent(), /играет только один/i, `${name}: demo single-player copy`);

    await demoPage.click("#test-error");
    assert.equal(await demoPage.locator("#interaction-result").getAttribute("data-status"), "pass", `${name}: demo invalid URL check`);
    assert.match(await demoPage.locator("#error-mount").textContent(), /корректный URL/i, `${name}: invalid URL rendered in component`);

    await demoPage.evaluate(() => window.demo.popupPlayer._onPlayerError(153));
    assert.match(await demoPage.locator("#popup-player .yvsl-error").textContent(), /HTTP Referer/i, `${name}: Error 153 guidance`);

    await demoPage.goto(`${server.origin}/demo/?show-file-warning=1`, { waitUntil: "domcontentloaded" });
    assert.equal(await demoPage.locator("#file-warning").isVisible(), true, `${name}: file protocol guidance visible`);
    assert.equal(await demoPage.locator("#demo-app").isHidden(), true, `${name}: players skipped in file warning mode`);
    assert.match(await demoPage.locator("#file-warning").textContent(), /start-demo\.cmd/i, `${name}: launcher instruction`);
    assert.deepEqual(demoErrors, [], `${name}: no demo page errors`);
    await demoPage.close();

    assert.deepEqual(pageErrors, [], `${name}: no page errors`);
    results.push(`${name}: ok`);
    await browser.close();
  }
} finally {
  await server.close();
}

console.log(results.join("\n"));
