import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { startStaticServer } from "../helpers/server.mjs";

const cases = [
  ["opening and closing popup preserves its iframe browsing context", async () => {
    const p = await make({ popup: { preload: true } });
    const frame = document.createElement("iframe");
    const loaded = new Promise(resolve => frame.onload = resolve);
    frame.srcdoc = "<!doctype html><p>loaded</p>";
    p.dom.stage.append(frame);
    await loaded;
    frame.contentWindow.sessionMarker = "preserved";
    p.open(); p.close(); p.open(); p.close();
    await sleep(100);
    return frame.contentWindow.sessionMarker === "preserved";
  }],
  ["popup close pauses locally even when YouTube omits its state event", async () => {
    const p = await make({ popup: { preload: true } });
    p.open(); p.play(); await sleep(50);
    let pauses = 0;
    p.dom.root.addEventListener("yellowvsl:pause", () => pauses++);
    p.adapter.pause = () => {};
    p.close();
    const stopped = p.getState().playerState === 2 && p.tickTimer === null && !p.popupOpen && pauses === 1;
    p._onStateChange(2);
    return stopped && pauses === 1;
  }],
  ["a stale PLAYING state cannot end the mirror transition", async () => {
    const p = await make({ playback: { autoplay: false, resume: false, start: 10, end: 16, loop: true } });
    p.play(); p.loop.ready = true; p.loop.mirror.player.time = 10.1;
    clearInterval(p.adapter.player.timer);
    p.adapter.player.time = 15.9;
    p.loop.startTransition(); await sleep(650);
    return p.loop.active && p.dom.loopMirror.classList.contains("yvsl-loop-mirror--visible");
  }],
  ["pausing during a transition prevents later audio or playback", async () => {
    const p = await make({ playback: { autoplay: false, resume: false, start: 10, end: 16, loop: true } });
    p.unmute(); p.play(); p.loop.ready = true; p.loop.mirror.player.time = 10.1;
    p.loop.startTransition(); await sleep(150); p.pause(); await sleep(500);
    return p.playerState === 2 && p.loop.mirror.getState() === 2 && !p.loop.active;
  }],
  ["single playback cancels another player's pending buffering", async () => {
    const a = await make(), b = await make();
    a.adapter.play = () => a._onStateChange(3);
    a.play(); b.play(); a._onStateChange(1);
    return a.playerState !== 1 && b.playerState === 1;
  }],
  ["explicit caption intent survives delayed track discovery", async () => {
    const Base = YT.Player;
    YT.Player = class extends Base { constructor(el, config) { super(el, config); this.captionTracks = []; } };
    const p = await make({ captions: { enabled: false, language: "en" } });
    p.enableCaptions("ru");
    p.adapter.player.captionTracks = [{ languageCode: "en" }, { languageCode: "ru" }];
    p.captions.onApiChange();
    return p.getState().captionLanguage === "ru" && p.adapter.player.captionTrack.languageCode === "ru";
  }],
  ["captions are synchronized with the loop mirror", async () => {
    const p = await make({ playback: { autoplay: false, loop: true, start: 10, end: 16 }, captions: { enabled: false, language: "en" } });
    p.enableCaptions("ru");
    const enabled = p.loop.mirror.player.captionTrack.languageCode === "ru";
    p.disableCaptions(); return enabled && !p.loop.mirror.player.captionTrack.languageCode;
  }],
  ["explicit storageKey persists without a container id", async () => {
    const a = await make({ storageKey: "stable" }); a.timeline.current = 20; a.timeline.grant(20); a.destroy();
    const b = await make({ storageKey: "stable", playback: { autoplay: false, resume: "auto" } });
    await sleep(80); return b.timeline.maxWatched === 20 && Math.abs(b.adapter.getCurrentTime() - 20) < 0.1;
  }],
  ["legacy shared state is neither imported nor deleted", async () => {
    const key = "yellowvsl:v1:M7lc1UVf-VE:0:end";
    localStorage.setItem(key, JSON.stringify({ position: 50, maxWatched: 80, unlocks: ["cta-1"], updatedAt: Date.now() }));
    const p = await make({}, "new-owner");
    return p.timeline.maxWatched === 0 && localStorage.getItem(key) !== null;
  }],
  ["duplicate persistent identities are rejected before modifying the first player", async () => {
    const a = await make({ storageKey: "unique" });
    try { await make({ storageKey: "unique" }); return false; }
    catch { return a.dom.root.isConnected && !a.destroyed; }
  }],
  ["explicit caption language overrides configuration", async () => {
    const p = await make({ captions: { enabled: false, language: "en" } });
    await sleep(20);
    p.enableCaptions("ru");
    await sleep(1100);
    return p.getState().captionLanguage === "ru" && p.adapter.player.captionTrack.languageCode === "ru";
  }],
  ["resume auto respects disabled autoplay", async () => {
    const first = await make({}, "resume-test");
    first.timeline.current = 20; first.timeline.grant(20); first.destroy();
    const p = await make({ playback: { autoplay: false, resume: "auto" } }, "resume-test");
    await sleep(80);
    return p.playerState !== 1 && Math.abs(p.adapter.getCurrentTime() - 20) < 0.1;
  }],
  ["preloading a popup does not open it", async () => {
    const p = await make({ popup: { preload: true }, playback: { resume: false } });
    return !p.popupOpen && p.playerState !== 1;
  }],
  ["closing before ready cancels autoplay", async () => {
    delayReady();
    const p = await make({ popup: true, playback: { resume: false } });
    p.open(); await sleep(20); p.close(); flushReady(); await p.ready;
    return !p.popupOpen && p.playerState !== 1;
  }],
  ["destroy cancels pending mirror creation", async () => {
    delayReady();
    const p = makeUnready({ playback: { autoplay: false, resume: false, loop: true } });
    await sleep(20); p.destroy(); flushReady(); await sleep(30);
    return !p.loop.mirror?.player;
  }],
  ["autoInit recreates a destroyed instance", async () => {
    const node = mount("auto-test"); Object.assign(node.dataset, { yellowVsl: "", video: VIDEO, autoplay: "false" });
    const a = YellowVSL.autoInit(node)[0]; await a.ready; a.destroy();
    const b = YellowVSL.autoInit(node)[0]; await b.ready;
    return a !== b && !b.destroyed && node.querySelectorAll(".yvsl-root").length === 1;
  }],
  ["play after completion restarts the fragment", async () => {
    const p = await make({ playback: { autoplay: false, resume: false, start: 10, end: 16 } });
    p.timeline.grant(6); p.timeline.current = 6; p.adapter.player.time = 16;
    let completions = 0; p.dom.root.addEventListener("yellowvsl:complete", () => completions++);
    p._tick(); p.play(); await sleep(350);
    return p.playerState === 1 && p.timeline.current < 1 && completions === 1;
  }],
  ["mute during mirror transition stays muted", async () => {
    const p = await make({ playback: { autoplay: false, resume: false, start: 10, end: 16, loop: true } });
    p.unmute(); p.play(); p.loop.ready = true; p.loop.mirror.player.time = 10.1;
    p.loop.startTransition(); p.mute(); await sleep(450);
    return p.getState().muted && p.adapter.isMuted() && p.loop.mirror.isMuted();
  }],
  ["unrelated destroy preserves modal scroll lock", async () => {
    document.body.style.overflow = "scroll";
    const p = await make({ popup: true }); p.open(); await p.ready;
    const other = await make(); other.destroy();
    const locked = document.body.style.overflow === "hidden";
    p.close(); return locked && document.body.style.overflow === "scroll";
  }],
  ["popup traps and restores keyboard focus", async () => {
    const trigger = document.createElement("button"); document.body.append(trigger); trigger.focus();
    const p = await make({ popup: true }); p.open(); await p.ready;
    p.dom.popupClose.focus();
    p.dom.popupClose.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
    const trapped = p.dom.popupBackdrop.contains(document.activeElement) && document.activeElement !== p.dom.popupClose;
    p.close(); return trapped && document.activeElement === trigger;
  }],
  ["errors stop ticking and hide controls without host CSS", async () => {
    const p = await make(); p.play(); p._onPlayerError(100);
    return !p.tickTimer && getComputedStyle(p.dom.controls).display === "none";
  }],
  ["empty fragments are rejected", async () => {
    try { await make({ playback: { start: 10, end: 10, autoplay: false } }); return false; } catch { return true; }
  }],
  ["out of bounds fragments fail during readiness", async () => {
    try { await make({ playback: { start: 120, autoplay: false } }); return false; } catch { return true; }
  }],
  ["same video instances do not share offers or progress", async () => {
    const offerA = mount("offer-a"), offerB = mount("offer-b");
    const a = await make({ ctas: [{ start: 0, reveal: "#offer-a" }] }, "player-a");
    a.timeline.current = 20; a.timeline.grant(20); a.dom.root.querySelector(".yvsl-cta").click(); a.destroy();
    const b = await make({ ctas: [{ start: 80, reveal: "#offer-b" }] }, "player-b");
    return b.timeline.maxWatched === 0 && offerB.hidden && b.dom.root.querySelector(".yvsl-cta").hidden;
  }],
  ["anonymous instances never write persistent progress", async () => {
    localStorage.clear(); const p = await make(); p.timeline.grant(20); p.destroy();
    return localStorage.length === 0;
  }],
  ["changed offer configuration cannot reuse an unlock", async () => {
    mount("offer-change");
    const a = await make({ ctas: [{ id: "offer", start: 0, reveal: "#offer-change" }] }, "offer-owner");
    a.dom.root.querySelector(".yvsl-cta").click(); a.destroy();
    const b = await make({ ctas: [{ id: "offer", start: 80, reveal: "#offer-change" }] }, "offer-owner");
    return document.querySelector("#offer-change").hidden && b.dom.root.querySelector(".yvsl-cta").hidden;
  }],
  ["destroy restores original reveal accessibility attributes", async () => {
    const offer = mount("aria-offer"); offer.hidden = true; offer.setAttribute("aria-hidden", "false");
    const p = await make({ reveals: [{ start: 50, selector: "#aria-offer" }] }); p.destroy();
    return offer.hidden && offer.getAttribute("aria-hidden") === "false";
  }]
];

const server = await startStaticServer();
const failures = [];
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    if (process.env.REGRESSION_ENGINE && name !== process.env.REGRESSION_ENGINE) continue;
    const browser = await engine.launch({ headless: true });
    try {
      for (const [label, check] of cases) {
        const page = await browser.newPage();
        try {
          await page.addInitScript({ path: "tests/browser/fake-youtube.js" });
          await page.goto(`${server.origin}/tests/browser/empty.html`);
          await page.addScriptTag({ url: `${server.origin}/dist/yellow-vsl.js` });
          await page.evaluate(() => {
            window.VIDEO = "M7lc1UVf-VE";
            window.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            window.mount = id => {
              let node = id && document.getElementById(id);
              if (!node) { node = document.createElement("div"); if (id) node.id = id; document.body.append(node); }
              return node;
            };
            window.makeUnready = (options = {}, id) => YellowVSL.create(mount(id), {
              video: VIDEO, playback: { autoplay: false, resume: false }, ...options
            });
            window.make = async (options, id) => { const p = makeUnready(options, id); await p.ready; return p; };
            window.readyCallbacks = [];
            window.delayReady = () => {
              const Base = YT.Player;
              YT.Player = class extends Base {
                constructor(el, config) { super(el, { ...config, events: { ...config.events,
                  onReady: event => readyCallbacks.push(() => config.events.onReady(event))
                } }); }
              };
            };
            window.flushReady = () => { for (const cb of readyCallbacks.splice(0)) cb(); };
          });
          assert.equal(await page.evaluate(check), true);
          console.log(`${name}: PASS ${label}`);
        } catch (error) {
          failures.push(`${name}: ${label}: ${error.message}`);
          console.error(`${name}: FAIL ${label}: ${error.message}`);
        } finally { await page.close(); }
      }
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
assert.deepEqual(failures, []);
