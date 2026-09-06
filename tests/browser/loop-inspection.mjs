import assert from "node:assert/strict";
import { chromium } from "playwright";
import { inspectVisibleYouTube } from "../helpers/loop-inspection.mjs";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const loading = '<div class="html5-video-player buffering-mode"><div class="player-controls-spinner"><div class="spinner">Loading</div></div></div>';
  const ready = '<div class="html5-video-player"></div>';
  await page.setContent('<div id="test"><div class="yvsl-stage"><iframe></iframe><div class="yvsl-loop-mirror"><iframe></iframe></div></div></div>');
  await page.locator('.yvsl-stage > iframe').evaluate((node, html) => { node.srcdoc = html; }, loading);
  await page.locator('.yvsl-loop-mirror iframe').evaluate((node, html) => { node.srcdoc = html; }, ready);
  await page.frameLocator('.yvsl-stage > iframe').locator('.spinner').waitFor();
  await page.frameLocator('.yvsl-loop-mirror iframe').locator('.html5-video-player').waitFor({ state: 'attached' });
  const primary = await inspectVisibleYouTube(page, '#test');
  assert.ok(primary.bufferingMode && primary.spinnerVisible, 'Negative control: an exposed loading frame MUST be detected');
  await page.locator('.yvsl-loop-mirror').evaluate(node => node.classList.add('yvsl-loop-mirror--visible'));
  const mirrored = await inspectVisibleYouTube(page, '#test');
  assert.ok(mirrored.mirrorVisible && !mirrored.bufferingMode && !mirrored.spinnerVisible);
  await page.locator('.yvsl-loop-mirror iframe').evaluate((node, html) => { node.srcdoc = html; }, loading);
  await page.frameLocator('.yvsl-loop-mirror iframe').locator('.spinner').waitFor();
  assert.ok((await inspectVisibleYouTube(page, '#test')).spinnerVisible, 'A buffering mirror is also a visible defect');
  await page.locator('.yvsl-loop-mirror').evaluate(node => node.append(document.createElement('iframe')));
  await assert.rejects(inspectVisibleYouTube(page, '#test'), /exactly one/);
  console.log('Loop inspection: both layers and failing negative controls verified');
} finally { await browser.close(); }
