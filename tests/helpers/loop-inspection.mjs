import assert from "node:assert/strict";

/** Inspect the layer actually presented to the viewer; locator failures are test failures. */
export async function inspectVisibleYouTube(page, container) {
  const mirror = page.locator(`${container} .yvsl-loop-mirror`);
  const presentedMirror = () => mirror.evaluate(node => node.classList.contains("yvsl-loop-mirror--visible"));
  const before = await presentedMirror();
  const selector = before ? `${container} .yvsl-loop-mirror iframe` : `${container} .yvsl-stage > iframe`;
  assert.equal(await page.locator(selector).count(), 1, `Expected exactly one presented YouTube iframe: ${selector}`);
  const frame = page.frameLocator(selector);
  const root = frame.locator(".html5-video-player");
  assert.equal(await root.count(), 1, "YouTube player root must exist; selector drift is not a passing result");
  const classes = await root.getAttribute("class", { timeout: 1000 });
  const spinnerVisible = await frame.locator(".player-controls-spinner .spinner").isVisible();
  const after = await presentedMirror();
  return {
    stable: before === after,
    mirrorVisible: before,
    bufferingMode: classes.split(/\s+/).includes("buffering-mode"),
    spinnerVisible
  };
}
