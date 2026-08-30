import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOptions } from "../../src/config.js";

test("конфигурация по умолчанию включает Smart Progress и Smart Autoplay", () => {
  const options = normalizeOptions({ video: "M7lc1UVf-VE" });
  assert.equal(options.progress.mode, "smart");
  assert.deepEqual(options.progress.points, [[0, 0], [0.1, 0.3], [0.5, 0.75], [1, 1]]);
  assert.equal(options.playback.autoplay, "smart");
  assert.equal(options.playback.noSeek, "forward");
  assert.equal(options.playback.resume, "ask");
  assert.equal(options.controls.captions, true);
  assert.deepEqual(options.captions, { enabled: "auto", language: null });
  assert.equal(options.youtubeUi, "clean");
});

test("start/end, rate, timed CTA, hooks и автоматические reveals нормализуются", () => {
  const options = normalizeOptions({
    video: "M7lc1UVf-VE",
    playback: { start: 15, end: 10, rate: 4, autoplay: false },
    progress: { mode: "real" },
    captions: { enabled: true, language: "ru" },
    youtubeUi: "native",
    ctas: [{ start: 9, end: 4, placement: "bottom-right", text: "CTA", background: "#123456", color: "#fff" }],
    hooks: [{ id: "hook", start: -2, end: 3, placement: "top-left" }],
    reveals: [{ start: 12, end: 8, selector: "#offer", persist: false }]
  });
  assert.equal(options.playback.start, 15);
  assert.equal(options.playback.end, 15);
  assert.equal(options.playback.rate, 2);
  assert.equal(options.playback.autoplay, false);
  assert.equal(options.progress.mode, "real");
  assert.deepEqual(options.captions, { enabled: true, language: "ru" });
  assert.equal(options.youtubeUi, "native");
  assert.deepEqual(options.ctas[0], { start: 9, end: 9, placement: "bottom-right", text: "CTA", background: "#123456", color: "#fff", id: "cta-1" });
  assert.equal(options.hooks[0].start, 0);
  assert.equal(options.hooks[0].placement, "top-left");
  assert.deepEqual(options.reveals[0], {
    start: 12,
    end: 12,
    selector: "#offer",
    persist: false,
    id: "reveal-1",
    placement: "below"
  });
  assert.equal(options.stage.poster, "auto");
  assert.equal(options.stage.clickToToggle, true);
  assert.equal(options.stage.revealDelay, 0);
});

test("неизвестный placement возвращается к below", () => {
  const options = normalizeOptions({ video: "M7lc1UVf-VE", ctas: [{ placement: "center" }] });
  assert.equal(options.ctas[0].placement, "below");
});
