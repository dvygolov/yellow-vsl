import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROGRESS_POINTS,
  interpolateProgress,
  invertProgress,
  parseAspectRatio,
  parseYouTubeId,
  toSafeUrl,
  validateProgressPoints
} from "../../src/utils.js";

test("parseYouTubeId принимает поддерживаемые варианты ссылок и чистый ID", () => {
  const id = "M7lc1UVf-VE";
  for (const value of [
    id,
    `https://www.youtube.com/watch?v=${id}&t=10`,
    `https://youtu.be/${id}?si=test`,
    `https://youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`
  ]) {
    assert.equal(parseYouTubeId(value), id, value);
  }
  assert.equal(parseYouTubeId("https://example.com/watch?v=M7lc1UVf-VE"), null);
  assert.equal(parseYouTubeId("not-a-vide"), null);
});

test("Smart Progress проходит через заданные контрольные точки", () => {
  assert.equal(interpolateProgress(0, DEFAULT_PROGRESS_POINTS), 0);
  assert.equal(interpolateProgress(0.1, DEFAULT_PROGRESS_POINTS), 0.3);
  assert.equal(interpolateProgress(0.5, DEFAULT_PROGRESS_POINTS), 0.75);
  assert.equal(interpolateProgress(1, DEFAULT_PROGRESS_POINTS), 1);
  assert.ok(Math.abs(interpolateProgress(0.3, DEFAULT_PROGRESS_POINTS) - 0.525) < 1e-12);
});

test("Smart Progress принимает процентную матрицу", () => {
  const points = validateProgressPoints([
    [0, 0],
    [5, 50],
    [30, 70],
    [50, 90],
    [100, 100]
  ]);
  assert.deepEqual(points, [[0, 0], [0.05, 0.5], [0.3, 0.7], [0.5, 0.9], [1, 1]]);
  assert.equal(interpolateProgress(0.05, points), 0.5);
  assert.equal(interpolateProgress(0.3, points), 0.7);
  assert.equal(interpolateProgress(0.5, points), 0.9);
});

test("Smart Progress монотонен и обратим", () => {
  let previous = -1;
  for (let index = 0; index <= 1000; index += 1) {
    const real = index / 1000;
    const visual = interpolateProgress(real, DEFAULT_PROGRESS_POINTS);
    assert.ok(visual >= previous, `Нарушена монотонность на ${real}`);
    assert.ok(Math.abs(invertProgress(visual, DEFAULT_PROGRESS_POINTS) - real) < 1e-9);
    previous = visual;
  }
});

test("validateProgressPoints отклоняет неоднозначные кривые", () => {
  assert.throws(() => validateProgressPoints([[0, 0], [0.5, 0.8]]), /Последняя/);
  assert.throws(() => validateProgressPoints([[0, 0], [0.5, 0.8], [0.4, 0.9], [1, 1]]), /монотонно/);
  assert.throws(() => validateProgressPoints([[0, 0], [0.5, 0.8], [1, 0.7]]), /Последняя|монотонно/);
});

test("служебные URL и aspect ratio нормализуются безопасно", () => {
  assert.equal(parseAspectRatio("9/16"), 9 / 16);
  assert.equal(parseAspectRatio("4:3"), 4 / 3);
  assert.equal(parseAspectRatio("broken"), 16 / 9);
  assert.equal(toSafeUrl("/offer", "https://example.com/page"), "https://example.com/offer");
  assert.equal(toSafeUrl("javascript:alert(1)", "https://example.com/"), null);
});
