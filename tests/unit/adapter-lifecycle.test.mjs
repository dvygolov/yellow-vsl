import test from "node:test";
import assert from "node:assert/strict";
import { YouTubeAdapter, loadYouTubeAPI } from "../../src/youtube-api.js";

test("destroy before Player creation cancels initialization", async () => {
  let created = 0;
  const adapter = new YouTubeAdapter({ element: {}, videoId: "M7lc1UVf-VE", win: {
    document: {}, YT: { Player: class { constructor() { created++; } } }
  } });
  const ready = adapter.mount();
  adapter.destroy();
  await assert.rejects(ready, { name: "AbortError" });
  assert.equal(created, 0);
});

test("destroy while waiting for onReady settles ready and ignores late events", async () => {
  let events, calls = 0, destroyed = 0;
  const adapter = new YouTubeAdapter({ element: {}, videoId: "M7lc1UVf-VE", events: {
    ready: () => calls++, stateChange: () => calls++, apiChange: () => calls++
  }, win: { document: {}, YT: { Player: class {
    constructor(el, config) { events = config.events; }
    destroy() { destroyed++; }
  } } } });
  const ready = adapter.mount();
  await new Promise(resolve => setImmediate(resolve));
  adapter.destroy();
  await assert.rejects(ready, { name: "AbortError" });
  events.onReady({}); events.onStateChange({ data: 1 }); events.onApiChange({});
  assert.equal(calls, 0); assert.equal(destroyed, 1);
});

test("missing iframe readiness times out", async () => {
  const adapter = new YouTubeAdapter({ element: {}, videoId: "M7lc1UVf-VE", timeout: 10,
    win: { document: {}, YT: { Player: class { destroy() {} } } }
  });
  await assert.rejects(adapter.mount(), { code: "ready-timeout" });
  adapter.destroy();
});

test("ready callback failure rejects rather than leaving initialization pending", async () => {
  const adapter = new YouTubeAdapter({ element: {}, videoId: "M7lc1UVf-VE", events: {
    ready: () => { throw new RangeError("invalid fragment"); }
  }, win: { document: {}, YT: { Player: class {
    constructor(el, config) { queueMicrotask(() => config.events.onReady({})); }
    destroy() {}
  } } } });
  await assert.rejects(adapter.mount(), /invalid fragment/); adapter.destroy();
});

test("failed API script is replaced on a subsequent load", async () => {
  let script = null, errors, appended = 0;
  const win = { setTimeout, clearTimeout, setInterval, clearInterval, document: {
    querySelector: () => script,
    createElement: () => ({ addEventListener: (event, callback) => { errors = callback; }, remove() { script = null; } }),
    head: { append(node) { script = node; appended++; } }
  } };
  const first = loadYouTubeAPI(win); errors();
  await assert.rejects(first, /загрузить/);
  const second = loadYouTubeAPI(win);
  win.YT = { Player: class {} }; win.onYouTubeIframeAPIReady();
  await second; assert.equal(appended, 2);
});
