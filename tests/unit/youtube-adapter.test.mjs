import test from "node:test";
import assert from "node:assert/strict";
import { loadYouTubeAPI, YouTubeAdapter } from "../../src/youtube-api.js";

test("loadYouTubeAPI сохраняет существующий onYouTubeIframeAPIReady", async () => {
  let previousCalls = 0;
  const head = { append() {} };
  const fakeWindow = {
    document: {
      querySelector: () => null,
      createElement: () => ({ addEventListener() {} }),
      head,
      documentElement: head
    },
    onYouTubeIframeAPIReady: () => { previousCalls += 1; },
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout
  };
  setTimeout(() => {
    fakeWindow.YT = { Player: class {} };
    fakeWindow.onYouTubeIframeAPIReady();
  }, 5);
  const result = await loadYouTubeAPI(fakeWindow);
  assert.equal(typeof result.Player, "function");
  assert.equal(previousCalls, 1);
});

test("YouTubeAdapter проксирует официальный IFrame API", async () => {
  let config;
  class FakePlayer {
    constructor(element, received) {
      config = received;
      this.time = 2;
      this.rate = 1;
      queueMicrotask(() => received.events.onReady({ target: this }));
    }
    playVideo() { config.events.onStateChange({ data: 1 }); }
    pauseVideo() { config.events.onStateChange({ data: 2 }); }
    seekTo(value) { this.time = value; }
    getCurrentTime() { return this.time; }
    getDuration() { return 100; }
    getPlayerState() { return 2; }
    mute() { this.muted = true; }
    unMute() { this.muted = false; }
    isMuted() { return this.muted; }
    setPlaybackRate(value) { this.rate = value; config.events.onPlaybackRateChange({ data: value }); }
    getPlaybackRate() { return this.rate; }
    getAvailablePlaybackRates() { return [0.5, 1, 1.5]; }
    getOptions(module) { return module === "captions" ? ["track", "tracklist"] : ["captions"]; }
    getOption(module, option) {
      if (module !== "captions") return null;
      if (option === "track") return this.captionTrack || {};
      if (option === "tracklist") return [{ languageCode: "en" }, { languageCode: "ru" }];
      return null;
    }
    setOption(module, option, value) {
      if (module === "captions" && option === "track") this.captionTrack = value;
      if (module === "captions" && option === "reload") this.captionsReloaded = value;
    }
    destroy() { this.destroyed = true; }
  }
  const states = [];
  const rates = [];
  const apiChanges = [];
  const fakeWindow = { YT: { Player: FakePlayer }, document: {} };
  const adapter = new YouTubeAdapter({
    element: {},
    videoId: "M7lc1UVf-VE",
    playerVars: { controls: 0 },
    win: fakeWindow,
    events: {
      stateChange: (state) => states.push(state),
      rateChange: (rate) => rates.push(rate),
      apiChange: () => apiChanges.push("captions")
    }
  });
  await adapter.mount();
  adapter.play();
  adapter.pause();
  adapter.seekTo(9);
  adapter.setPlaybackRate(1.5);
  assert.deepEqual(states, [1, 2]);
  assert.deepEqual(rates, [1.5]);
  assert.equal(adapter.getCurrentTime(), 9);
  assert.deepEqual(adapter.getCaptionTracks(), [{ languageCode: "en" }, { languageCode: "ru" }]);
  adapter.setCaptionTrack({ languageCode: "ru" });
  assert.deepEqual(adapter.getCaptionTrack(), { languageCode: "ru" });
  adapter.setCaptionTrack(null);
  assert.deepEqual(adapter.getCaptionTrack(), {});
  adapter.reloadCaptions();
  assert.equal(adapter.player.captionsReloaded, true);
  config.events.onApiChange({ target: adapter.player });
  assert.deepEqual(apiChanges, ["captions"]);
  assert.equal(config.videoId, "M7lc1UVf-VE");
  assert.equal(config.playerVars.controls, 0);
  adapter.destroy();
});
