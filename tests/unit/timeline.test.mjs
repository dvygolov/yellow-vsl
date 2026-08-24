import test from "node:test";
import assert from "node:assert/strict";
import { PlaybackTimeline } from "../../src/timeline.js";

test("timeline переводит абсолютное время YouTube во время фрагмента", () => {
  const timeline = new PlaybackTimeline({ start: 20, end: 80, noSeek: "forward" });
  assert.equal(timeline.setDuration(120), 60);
  timeline.observe(20, { playing: true, now: 0 });
  timeline.observe(25, { playing: true, now: 5000 });
  assert.equal(timeline.current, 5);
  assert.equal(timeline.maxWatched, 5);
});

test("переход вперёд блокируется, назад в просмотренную область разрешён", () => {
  const timeline = new PlaybackTimeline({ start: 0, noSeek: "forward" });
  timeline.setDuration(100);
  timeline.observe(0, { playing: true, now: 0 });
  timeline.observe(1, { playing: true, now: 1000 });
  const jump = timeline.observe(50, { playing: true, now: 1100 });
  assert.equal(jump.blocked, true);
  assert.equal(jump.correctionSourceTime, 1);
  assert.equal(timeline.seek(0.5), 0.5);
  assert.equal(timeline.seek(60), 1);
});

test("сохранённый maxWatched разрешает resume и обратную перемотку", () => {
  const timeline = new PlaybackTimeline({ start: 10, end: 50, maxWatched: 20 });
  timeline.setDuration(100);
  assert.equal(timeline.seek(18), 28);
  assert.equal(timeline.seek(30), 30);
});
