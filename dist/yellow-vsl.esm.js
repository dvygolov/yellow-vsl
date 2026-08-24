/*! YellowVSL v1.1.0 | MIT License | https://github.com/dvygolov/yellow-vsl */

// src/utils.js
var DEFAULT_PROGRESS_POINTS = Object.freeze([
  Object.freeze([0, 0]),
  Object.freeze([0.1, 0.3]),
  Object.freeze([0.5, 0.75]),
  Object.freeze([1, 1])
]);
var VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
var ALLOWED_URL_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:", "mailto:", "tel:"]);
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
function parseYouTubeId(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (VIDEO_ID_PATTERN.test(input)) return input;
  let url;
  try {
    url = new URL(input.startsWith("//") ? `https:${input}` : input);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  let candidate = null;
  if (hostname === "youtu.be") {
    candidate = url.pathname.split("/").filter(Boolean)[0];
  } else if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "music.youtube.com" || hostname === "youtube-nocookie.com") {
    candidate = url.searchParams.get("v");
    if (!candidate) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live", "v"].includes(parts[0])) candidate = parts[1];
    }
  }
  return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}
function validateProgressPoints(points) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new TypeError("progress.points \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 \u0434\u0432\u0443\u0445 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u044B\u0445 \u0442\u043E\u0447\u0435\u043A");
  }
  const normalized = points.map((point) => {
    if (!Array.isArray(point) || point.length !== 2) {
      throw new TypeError("\u041A\u0430\u0436\u0434\u0430\u044F \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430 progress.points \u0434\u043E\u043B\u0436\u043D\u0430 \u0438\u043C\u0435\u0442\u044C \u0444\u043E\u0440\u043C\u0430\u0442 [real, visual]");
    }
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new RangeError("\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B progress.points \u0434\u043E\u043B\u0436\u043D\u044B \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u0432 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0435 \u043E\u0442 0 \u0434\u043E 1");
    }
    return [x, y];
  });
  if (normalized[0][0] !== 0 || normalized[0][1] !== 0) {
    throw new RangeError("\u041F\u0435\u0440\u0432\u0430\u044F \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430 progress.points \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C [0, 0]");
  }
  const last = normalized.at(-1);
  if (last[0] !== 1 || last[1] !== 1) {
    throw new RangeError("\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430 progress.points \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C [1, 1]");
  }
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    if (current[0] <= previous[0] || current[1] < previous[1]) {
      throw new RangeError("progress.points \u0434\u043E\u043B\u0436\u043D\u044B \u043C\u043E\u043D\u043E\u0442\u043E\u043D\u043D\u043E \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u0430\u0442\u044C \u043F\u043E \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0439 \u0438 \u0432\u0438\u0437\u0443\u0430\u043B\u044C\u043D\u043E\u0439 \u0448\u043A\u0430\u043B\u0430\u043C");
    }
  }
  return normalized;
}
function interpolateProgress(realFraction, points = DEFAULT_PROGRESS_POINTS) {
  const value = clamp(realFraction, 0, 1);
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  for (let index = 1; index < points.length; index += 1) {
    const [rightX, rightY] = points[index];
    if (value <= rightX) {
      const [leftX, leftY] = points[index - 1];
      const local = (value - leftX) / (rightX - leftX);
      return leftY + local * (rightY - leftY);
    }
  }
  return 1;
}
function invertProgress(visualFraction, points = DEFAULT_PROGRESS_POINTS) {
  const value = clamp(visualFraction, 0, 1);
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  for (let index = 1; index < points.length; index += 1) {
    const [rightX, rightY] = points[index];
    if (value <= rightY) {
      const [leftX, leftY] = points[index - 1];
      if (rightY === leftY) return leftX;
      const local = (value - leftY) / (rightY - leftY);
      return leftX + local * (rightX - leftX);
    }
  }
  return 1;
}
function toSafeUrl(value, baseUrl) {
  if (!value) return null;
  try {
    const url = new URL(String(value), baseUrl || "https://example.invalid/");
    return ALLOWED_URL_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function parseAspectRatio(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return 16 / 9;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[/:]\s*(\d+(?:\.\d+)?)$/);
  if (!match) return 16 / 9;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? width / height : 16 / 9;
}
function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const remainder = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

// src/config.js
var DEFAULT_LOCALE = Object.freeze({
  play: "\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438",
  pause: "\u041F\u0430\u0443\u0437\u0430",
  mute: "\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A",
  unmute: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A \u0438 \u043D\u0430\u0447\u0430\u0442\u044C \u0441\u043D\u0430\u0447\u0430\u043B\u0430",
  fullscreen: "\u041D\u0430 \u0432\u0435\u0441\u044C \u044D\u043A\u0440\u0430\u043D",
  exitFullscreen: "\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430",
  progress: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430",
  continueTitle: "\u0412\u044B \u0443\u0436\u0435 \u043D\u0430\u0447\u0430\u043B\u0438 \u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u044D\u0442\u043E \u0432\u0438\u0434\u0435\u043E",
  continue: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
  restart: "\u041D\u0430\u0447\u0430\u0442\u044C \u0441\u043D\u0430\u0447\u0430\u043B\u0430",
  autoplayBlocked: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E",
  close: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
  speed: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C",
  genericError: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E",
  identityError: "YouTube \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B \u0430\u0434\u0440\u0435\u0441 \u0441\u0430\u0439\u0442\u0430 (HTTP Referer). \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0447\u0435\u0440\u0435\u0437 http:// \u0438\u043B\u0438 https://, \u0430 \u043D\u0435 \u043A\u0430\u043A \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0444\u0430\u0439\u043B.",
  embedError: "\u0410\u0432\u0442\u043E\u0440 \u0432\u0438\u0434\u0435\u043E \u0437\u0430\u043F\u0440\u0435\u0442\u0438\u043B \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043D\u0430 \u0434\u0440\u0443\u0433\u0438\u0445 \u0441\u0430\u0439\u0442\u0430\u0445",
  unavailableError: "\u0412\u0438\u0434\u0435\u043E \u0443\u0434\u0430\u043B\u0435\u043D\u043E, \u0441\u043A\u0440\u044B\u0442\u043E \u0438\u043B\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E"
});
var DEFAULT_OPTIONS = Object.freeze({
  playback: Object.freeze({
    autoplay: "smart",
    noSeek: "forward",
    resume: "ask",
    start: 0,
    end: null,
    loop: false,
    rate: 1,
    singlePlayback: true
  }),
  progress: Object.freeze({
    mode: "smart",
    points: DEFAULT_PROGRESS_POINTS
  }),
  controls: Object.freeze({
    play: true,
    volume: true,
    fullscreen: true,
    progress: true,
    speed: false
  }),
  aspectRatio: "16/9",
  sticky: false,
  popup: false,
  ctas: Object.freeze([]),
  hooks: Object.freeze([]),
  theme: Object.freeze({}),
  locale: DEFAULT_LOCALE
});
function normalizeTimedItem(item, index, kind) {
  const start = Math.max(0, Number(item?.start) || 0);
  const rawEnd = item?.end == null ? Infinity : Number(item.end);
  const end = Number.isFinite(rawEnd) ? Math.max(start, rawEnd) : Infinity;
  const placement = item?.placement === "above" ? "above" : "below";
  return {
    ...item,
    id: String(item?.id || `${kind}-${index + 1}`),
    start,
    end,
    placement
  };
}
function normalizeOptions(options = {}) {
  const playback = { ...DEFAULT_OPTIONS.playback, ...options.playback || {} };
  playback.start = Math.max(0, Number(playback.start) || 0);
  playback.end = playback.end == null ? null : Math.max(playback.start, Number(playback.end) || playback.start);
  playback.rate = clamp(playback.rate, 0.25, 2);
  playback.autoplay = playback.autoplay === false ? false : "smart";
  playback.noSeek = playback.noSeek === false ? false : "forward";
  playback.resume = ["ask", "auto", false].includes(playback.resume) ? playback.resume : "ask";
  const progress = { ...DEFAULT_OPTIONS.progress, ...options.progress || {} };
  progress.mode = ["smart", "real", "hidden"].includes(progress.mode) ? progress.mode : "smart";
  progress.points = validateProgressPoints(progress.points || DEFAULT_PROGRESS_POINTS);
  const controls = { ...DEFAULT_OPTIONS.controls, ...options.controls || {} };
  if (progress.mode === "hidden") controls.progress = false;
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    video: options.video,
    playback,
    progress,
    controls,
    aspectRatio: options.aspectRatio || DEFAULT_OPTIONS.aspectRatio,
    aspectRatioValue: parseAspectRatio(options.aspectRatio || DEFAULT_OPTIONS.aspectRatio),
    ctas: Array.isArray(options.ctas) ? options.ctas.map((item, index) => normalizeTimedItem(item, index, "cta")) : [],
    hooks: Array.isArray(options.hooks) ? options.hooks.map((item, index) => normalizeTimedItem(item, index, "hook")) : [],
    theme: { ...options.theme || {} },
    locale: { ...DEFAULT_LOCALE, ...options.locale || {} }
  };
}
function optionsFromDataset(element2) {
  const dataset = element2.dataset;
  const playback = {};
  const progress = {};
  if (dataset.autoplay === "false") playback.autoplay = false;
  if (dataset.resume === "false") playback.resume = false;
  if (dataset.resume === "auto") playback.resume = "auto";
  if (dataset.start != null) playback.start = Number(dataset.start);
  if (dataset.end != null) playback.end = Number(dataset.end);
  if (dataset.loop === "true") playback.loop = true;
  if (dataset.rate != null) playback.rate = Number(dataset.rate);
  if (dataset.noSeek === "false") playback.noSeek = false;
  if (dataset.progress) progress.mode = dataset.progress;
  return {
    video: dataset.video,
    aspectRatio: dataset.aspectRatio,
    playback,
    progress,
    sticky: dataset.sticky === "true",
    popup: dataset.popupTrigger ? { trigger: dataset.popupTrigger } : false
  };
}

// src/storage.js
var THIRTY_DAYS = 30 * 24 * 60 * 60 * 1e3;
var ProgressStorage = class {
  constructor(storage, key, ttl = THIRTY_DAYS) {
    this.storage = storage;
    this.key = key;
    this.ttl = ttl;
  }
  load() {
    if (!this.storage) return this.empty();
    try {
      const parsed = JSON.parse(this.storage.getItem(this.key));
      if (!parsed || Date.now() - Number(parsed.updatedAt || 0) > this.ttl) {
        this.storage.removeItem(this.key);
        return this.empty();
      }
      return {
        position: Math.max(0, Number(parsed.position) || 0),
        maxWatched: Math.max(0, Number(parsed.maxWatched) || 0),
        unlocks: Array.isArray(parsed.unlocks) ? [...new Set(parsed.unlocks.map(String))] : [],
        activeAt: Math.max(0, Number(parsed.activeAt) || 0),
        updatedAt: Number(parsed.updatedAt) || Date.now()
      };
    } catch {
      return this.empty();
    }
  }
  save(state) {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify({
        position: Math.max(0, Number(state.position) || 0),
        maxWatched: Math.max(0, Number(state.maxWatched) || 0),
        unlocks: Array.isArray(state.unlocks) ? [...new Set(state.unlocks.map(String))] : [],
        activeAt: Math.max(0, Number(state.activeAt) || 0),
        updatedAt: Date.now()
      }));
      return true;
    } catch {
      return false;
    }
  }
  clear() {
    try {
      this.storage?.removeItem(this.key);
    } catch {
    }
  }
  empty() {
    return { position: 0, maxWatched: 0, unlocks: [], activeAt: 0, updatedAt: 0 };
  }
};
function createStorageKey(videoId, start, end) {
  return `yellowvsl:v1:${videoId}:${Number(start) || 0}:${end == null ? "end" : Number(end)}`;
}

// src/styles.js
var STYLES = `
.yvsl-root {
  --yvsl-accent: #ffd400;
  --yvsl-bg: #111214;
  --yvsl-panel: #1b1d21;
  --yvsl-text: #ffffff;
  --yvsl-muted: #a7abb4;
  --yvsl-radius: 14px;
  --yvsl-shadow: 0 18px 50px rgba(0, 0, 0, .28);
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  color: var(--yvsl-text);
  background: var(--yvsl-bg);
  border-radius: var(--yvsl-radius);
  box-shadow: var(--yvsl-shadow);
  overflow: hidden;
  font: 500 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  z-index: 0;
}
.yvsl-root *, .yvsl-root *::before, .yvsl-root *::after { box-sizing: border-box; }
.yvsl-root button, .yvsl-root select, .yvsl-root input { font: inherit; }
.yvsl-stage {
  width: 100%;
  aspect-ratio: var(--yvsl-aspect, 16 / 9);
  background: #000;
}
.yvsl-stage > div, .yvsl-stage iframe { width: 100% !important; height: 100% !important; display: block; border: 0; }
.yvsl-zone { display: grid; gap: 8px; }
.yvsl-zone:empty { display: none; }
.yvsl-zone--above { padding: 12px 14px 0; }
.yvsl-zone--below { padding: 0 14px 12px; }
.yvsl-hook {
  margin: 0;
  padding: 10px 12px;
  color: var(--yvsl-text);
  background: color-mix(in srgb, var(--yvsl-accent) 16%, transparent);
  border-left: 3px solid var(--yvsl-accent);
  border-radius: 8px;
  text-align: center;
}
.yvsl-cta {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 44px;
  padding: 10px 18px;
  color: #111;
  background: var(--yvsl-accent);
  border: 0;
  border-radius: 10px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}
.yvsl-message {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 14px;
  color: var(--yvsl-text);
  background: var(--yvsl-panel);
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}
.yvsl-message[hidden] { display: none; }
.yvsl-message__text { flex: 1 1 220px; text-align: center; }
.yvsl-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 40px;
  min-height: 40px;
  padding: 8px 12px;
  color: var(--yvsl-text);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 9px;
  cursor: pointer;
}
.yvsl-btn:hover { background: rgba(255, 255, 255, .08); }
.yvsl-btn:focus-visible, .yvsl-progress:focus-visible, .yvsl-cta:focus-visible, .yvsl-speed:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--yvsl-accent) 70%, white);
  outline-offset: 2px;
}
.yvsl-btn--accent { color: #111; background: var(--yvsl-accent); border-color: var(--yvsl-accent); font-weight: 800; }
.yvsl-controls {
  display: grid;
  grid-template-columns: auto auto minmax(90px, 1fr) auto auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--yvsl-panel);
}
.yvsl-progress {
  width: 100%;
  height: 24px;
  margin: 0;
  padding: 0;
  accent-color: var(--yvsl-accent);
  cursor: pointer;
}
.yvsl-progress[hidden] { display: none; }
.yvsl-time { min-width: 42px; color: var(--yvsl-muted); font-variant-numeric: tabular-nums; text-align: center; }
.yvsl-speed {
  min-height: 40px;
  padding: 6px 8px;
  color: var(--yvsl-text);
  background: var(--yvsl-bg);
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 9px;
}
.yvsl-error { padding: 28px 18px; color: #fff; background: #35151a; text-align: center; }
.yvsl-error[hidden] { display: none; }
.yvsl-sticky-sentinel { width: 1px; height: 1px; pointer-events: none; }
.yvsl-root--sticky {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: var(--yvsl-sticky-width, min(420px, calc(100vw - 24px)));
  z-index: 2147483000;
}
.yvsl-sticky-close { display: none; position: absolute; top: 8px; right: 8px; z-index: 2; background: rgba(0,0,0,.72); }
.yvsl-root--sticky .yvsl-sticky-close { display: inline-flex; }
.yvsl-popup-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(0, 0, 0, .78);
  z-index: 2147483001;
}
.yvsl-popup-backdrop[hidden] { display: none; }
.yvsl-popup-panel { width: min(960px, 100%); max-height: calc(100vh - 44px); overflow: auto; }
.yvsl-popup-close { position: fixed; top: 14px; right: 14px; z-index: 1; background: #111; }
.yvsl-root:fullscreen { width: 100%; height: 100%; border-radius: 0; display: flex; flex-direction: column; justify-content: center; }
.yvsl-root:fullscreen .yvsl-stage { max-height: calc(100vh - 76px); }
.yvsl-visually-hidden { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
@media (max-width: 520px) {
  .yvsl-controls { grid-template-columns: auto auto minmax(70px, 1fr) auto auto; padding: 8px; gap: 5px; }
  .yvsl-time { display: none; }
  .yvsl-btn { min-width: 38px; padding: 7px 9px; }
  .yvsl-root--sticky { right: 8px; bottom: 8px; width: calc(100vw - 16px); }
}
@media (prefers-reduced-motion: reduce) {
  .yvsl-root *, .yvsl-root *::before, .yvsl-root *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}
`;
var installed = false;
function installStyles(doc = globalThis.document, nonce = null) {
  if (!doc || installed || doc.getElementById("yellow-vsl-styles")) return;
  const style = doc.createElement("style");
  style.id = "yellow-vsl-styles";
  if (nonce) style.nonce = nonce;
  style.textContent = STYLES;
  (doc.head || doc.documentElement).append(style);
  installed = true;
}

// src/timeline.js
var PlaybackTimeline = class {
  constructor({ start = 0, end = null, noSeek = "forward", rate = 1, maxWatched = 0 } = {}) {
    this.start = Math.max(0, Number(start) || 0);
    this.end = end == null ? null : Math.max(this.start, Number(end) || this.start);
    this.noSeek = noSeek;
    this.rate = Number(rate) || 1;
    this.duration = 0;
    this.current = 0;
    this.maxWatched = Math.max(0, Number(maxWatched) || 0);
    this.lastTickAt = null;
  }
  setDuration(sourceDuration) {
    const sourceEnd = this.end == null ? Number(sourceDuration) || this.start : Math.min(this.end, Number(sourceDuration) || this.end);
    this.duration = Math.max(0, sourceEnd - this.start);
    this.current = clamp(this.current, 0, this.duration);
    this.maxWatched = clamp(this.maxWatched, 0, this.duration);
    return this.duration;
  }
  observe(sourceTime, { playing = false, now = performanceNow() } = {}) {
    const logical = clamp((Number(sourceTime) || 0) - this.start, 0, this.duration || Infinity);
    let blocked = false;
    const elapsed = this.lastTickAt == null ? 0 : Math.max(0, (now - this.lastTickAt) / 1e3);
    const allowance = Math.max(1.5, elapsed * this.rate + 0.75);
    if (this.noSeek === "forward" && logical > this.maxWatched + allowance) {
      blocked = true;
    } else if (playing) {
      this.current = logical;
      this.maxWatched = Math.max(this.maxWatched, logical);
      this.lastTickAt = now;
    } else {
      this.current = logical;
      this.lastTickAt = null;
    }
    return {
      current: this.current,
      maxWatched: this.maxWatched,
      blocked,
      correctionSourceTime: this.start + this.maxWatched
    };
  }
  seek(logicalTime) {
    const requested = clamp(logicalTime, 0, this.duration || Infinity);
    const allowed = this.noSeek === "forward" ? Math.min(requested, this.maxWatched) : requested;
    this.current = allowed;
    this.lastTickAt = null;
    return this.start + allowed;
  }
  grant(logicalTime) {
    this.maxWatched = Math.max(this.maxWatched, clamp(logicalTime, 0, this.duration || Infinity));
  }
  resetClock() {
    this.lastTickAt = null;
  }
};
function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

// src/youtube-api.js
var API_URL = "https://www.youtube.com/iframe_api";
var apiPromise = null;
function loadYouTubeAPI(win = globalThis.window) {
  if (!win?.document) return Promise.reject(new Error("YouTube API \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435"));
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previousReady = win.onYouTubeIframeAPIReady;
    let settled = false;
    let pollTimer;
    let timeoutTimer;
    const finish = () => {
      if (settled || !win.YT?.Player) return;
      settled = true;
      win.clearInterval(pollTimer);
      win.clearTimeout(timeoutTimer);
      resolve(win.YT);
    };
    win.onYouTubeIframeAPIReady = function yellowVslYouTubeReady(...args) {
      try {
        if (typeof previousReady === "function") previousReady.apply(this, args);
      } finally {
        finish();
      }
    };
    let script = win.document.querySelector(`script[src="${API_URL}"]`);
    if (!script) {
      script = win.document.createElement("script");
      script.src = API_URL;
      script.async = true;
      script.addEventListener("error", () => {
        if (settled) return;
        settled = true;
        win.clearInterval(pollTimer);
        win.clearTimeout(timeoutTimer);
        apiPromise = null;
        reject(new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C YouTube IFrame API"));
      }, { once: true });
      (win.document.head || win.document.documentElement).append(script);
    }
    pollTimer = win.setInterval(finish, 50);
    timeoutTimer = win.setTimeout(() => {
      if (settled) return;
      settled = true;
      win.clearInterval(pollTimer);
      apiPromise = null;
      reject(new Error("YouTube IFrame API \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0432\u043E\u0432\u0440\u0435\u043C\u044F"));
    }, 2e4);
  });
  return apiPromise;
}
var YouTubeAdapter = class {
  constructor({ element: element2, videoId, playerVars = {}, events = {}, win = globalThis.window }) {
    this.element = element2;
    this.videoId = videoId;
    this.playerVars = playerVars;
    this.events = events;
    this.win = win;
    this.player = null;
  }
  async mount() {
    const YT = await loadYouTubeAPI(this.win);
    await new Promise((resolve, reject) => {
      let isReady = false;
      this.player = new YT.Player(this.element, {
        videoId: this.videoId,
        width: "100%",
        height: "100%",
        playerVars: this.playerVars,
        events: {
          onReady: (event) => {
            isReady = true;
            this.events.ready?.(event);
            resolve();
          },
          onStateChange: (event) => this.events.stateChange?.(event.data, event),
          onPlaybackRateChange: (event) => this.events.rateChange?.(event.data, event),
          onError: (event) => {
            this.events.error?.(event.data, event);
            if (!isReady) reject(new Error(`YouTube Player error: ${event.data}`));
          }
        }
      });
    });
    return this;
  }
  play() {
    this.player?.playVideo?.();
  }
  pause() {
    this.player?.pauseVideo?.();
  }
  stop() {
    this.player?.stopVideo?.();
  }
  mute() {
    this.player?.mute?.();
  }
  unmute() {
    this.player?.unMute?.();
  }
  isMuted() {
    return Boolean(this.player?.isMuted?.());
  }
  setVolume(value) {
    this.player?.setVolume?.(value);
  }
  getVolume() {
    return Number(this.player?.getVolume?.() ?? 100);
  }
  seekTo(seconds) {
    this.player?.seekTo?.(seconds, true);
  }
  getCurrentTime() {
    return Number(this.player?.getCurrentTime?.() ?? 0);
  }
  getDuration() {
    return Number(this.player?.getDuration?.() ?? 0);
  }
  getState() {
    return Number(this.player?.getPlayerState?.() ?? -1);
  }
  setPlaybackRate(rate) {
    this.player?.setPlaybackRate?.(rate);
  }
  getPlaybackRate() {
    return Number(this.player?.getPlaybackRate?.() ?? 1);
  }
  getAvailablePlaybackRates() {
    return this.player?.getAvailablePlaybackRates?.() || [1];
  }
  destroy() {
    this.player?.destroy?.();
    this.player = null;
  }
};
var YT_STATE = Object.freeze({
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
});

// src/player.js
var instances = /* @__PURE__ */ new Set();
var nextInstanceId = 1;
function element(tag, className, attributes = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [name, value] of Object.entries(attributes)) {
    if (value == null || value === false) continue;
    if (name === "text") node.textContent = value;
    else if (name === "hidden") node.hidden = Boolean(value);
    else node.setAttribute(name, value === true ? "" : String(value));
  }
  return node;
}
function resolveTarget(target) {
  if (typeof target === "string") return document.querySelector(target);
  return target instanceof Element ? target : null;
}
var YellowVSLPlayer = class {
  constructor(target, options = {}, dependencies = {}) {
    this.mount = resolveTarget(target);
    if (!this.mount) throw new TypeError("\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0434\u043B\u044F \u0440\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u044F YellowVSL");
    this.options = normalizeOptions(options);
    this.videoId = parseYouTubeId(this.options.video);
    if (!this.videoId) throw new TypeError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 URL \u0438\u043B\u0438 ID \u0432\u0438\u0434\u0435\u043E YouTube");
    this.id = `yvsl-${nextInstanceId++}`;
    this.dependencies = dependencies;
    this.destroyed = false;
    this.adapter = null;
    this.playerState = YT_STATE.UNSTARTED;
    this.tickTimer = null;
    this.saveAt = 0;
    this.progressEventAt = 0;
    this.seekGeneration = 0;
    this.completed = false;
    this.lastActiveAt = 0;
    this.readyState = false;
    this.timedNodes = [];
    this.cleanup = [];
    this.managedRevealElements = /* @__PURE__ */ new Map();
    this.stickyDismissed = false;
    this.stickyOutOfView = false;
    this.popupOpen = false;
    this.originalNodes = Array.from(this.mount.childNodes);
    installStyles(document, this.options.styleNonce);
    this._render();
    this._applyTheme();
    const localStorage = dependencies.storage ?? safeLocalStorage();
    this.storage = new ProgressStorage(
      localStorage,
      createStorageKey(this.videoId, this.options.playback.start, this.options.playback.end)
    );
    this.saved = this.storage.load();
    this.unlocks = new Set(this.saved.unlocks);
    this.timeline = new PlaybackTimeline({
      ...this.options.playback,
      maxWatched: this.saved.maxWatched
    });
    this._renderTimedItems();
    this._setupPopup();
    this._setupSticky();
    this._bindLifecycle();
    instances.add(this);
    this.ready = this._mountAdapter();
  }
  async _mountAdapter() {
    try {
      const origin = location.protocol === "http:" || location.protocol === "https:" ? location.origin : void 0;
      const playerVars = {
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        rel: 0,
        iv_load_policy: 3,
        fs: 0,
        start: Math.floor(this.options.playback.start)
      };
      if (this.options.playback.end != null) playerVars.end = Math.floor(this.options.playback.end);
      if (origin) playerVars.origin = origin;
      const adapterFactory = this.dependencies.adapterFactory || ((config) => new YouTubeAdapter(config));
      this.adapter = adapterFactory({
        element: this.dom.playerHost,
        videoId: this.videoId,
        playerVars,
        events: {
          ready: () => this._onReady(),
          stateChange: (state) => this._onStateChange(state),
          rateChange: (rate) => this._onRateChange(rate),
          error: (code) => this._onPlayerError(code)
        }
      });
      await this.adapter.mount();
      return this;
    } catch (error) {
      this._showError(error?.message || this.options.locale.genericError, "api");
      throw error;
    }
  }
  _render() {
    const locale = this.options.locale;
    const root = element("section", "yvsl-root", { "data-yvsl-id": this.id });
    root.style.setProperty("--yvsl-aspect", String(this.options.aspectRatioValue));
    const sentinel = element("div", "yvsl-sticky-sentinel", { "aria-hidden": "true" });
    const above = element("div", "yvsl-zone yvsl-zone--above");
    const message = element("div", "yvsl-message", { hidden: true, "aria-live": "polite" });
    const stage = element("div", "yvsl-stage");
    const playerHost = element("div", "yvsl-player-host", { id: `${this.id}-player` });
    stage.append(playerHost);
    const error = element("div", "yvsl-error", { hidden: true, role: "alert" });
    const controls = element("div", "yvsl-controls");
    const play = this._button("\u25B6", locale.play, "yvsl-play");
    const volume = this._button("\u{1F507}", locale.unmute, "yvsl-volume");
    const progress = element("input", "yvsl-progress", {
      type: "range",
      min: 0,
      max: 1e3,
      step: 1,
      value: 0,
      "aria-label": locale.progress
    });
    const time = element("span", "yvsl-time", { text: "0:00", "aria-hidden": "true" });
    const speed = element("select", "yvsl-speed", { "aria-label": locale.speed });
    speed.hidden = !this.options.controls.speed;
    const fullscreen = this._button("\u26F6", locale.fullscreen, "yvsl-fullscreen");
    const stickyClose = this._button("\xD7", locale.close, "yvsl-sticky-close");
    if (!this.options.controls.play) play.hidden = true;
    if (!this.options.controls.volume) volume.hidden = true;
    if (!this.options.controls.progress) progress.hidden = true;
    if (!this.options.controls.fullscreen || !root.requestFullscreen) fullscreen.hidden = true;
    controls.append(play, volume, progress, time, speed, fullscreen);
    const below = element("div", "yvsl-zone yvsl-zone--below");
    root.append(stickyClose, above, message, stage, error, controls, below);
    this.mount.replaceChildren(sentinel, root);
    this.dom = { root, sentinel, above, message, stage, playerHost, error, controls, play, volume, progress, time, speed, fullscreen, stickyClose, below };
    this._listen(play, "click", () => this.playerState === YT_STATE.PLAYING ? this.pause() : this.play());
    this._listen(volume, "click", () => this.adapter?.isMuted?.() ? this.unmute(true) : this.mute());
    this._listen(progress, "input", () => this._seekFromProgress());
    this._listen(speed, "change", () => this._setRate(Number(speed.value)));
    this._listen(fullscreen, "click", () => this._toggleFullscreen());
    this._listen(stickyClose, "click", () => this._dismissSticky());
    this._listen(document, "fullscreenchange", () => this._updateFullscreenButton());
  }
  _button(text, label, extraClass = "") {
    return element("button", `yvsl-btn ${extraClass}`.trim(), {
      type: "button",
      text,
      title: label,
      "aria-label": label
    });
  }
  _applyTheme() {
    const map = {
      accent: "--yvsl-accent",
      background: "--yvsl-bg",
      panel: "--yvsl-panel",
      text: "--yvsl-text",
      muted: "--yvsl-muted",
      radius: "--yvsl-radius",
      shadow: "--yvsl-shadow"
    };
    for (const [key, cssVariable] of Object.entries(map)) {
      if (this.options.theme[key] != null) this.dom.root.style.setProperty(cssVariable, String(this.options.theme[key]));
    }
  }
  _onReady() {
    if (this.destroyed || this.readyState) return;
    this.readyState = true;
    this._refreshDuration();
    this._populateRates();
    this._setRate(this.options.playback.rate);
    this._updateUi();
    this._emit("ready");
    this._emit("view");
    const canResume = this.saved.position > 3 && this.saved.position < Math.max(0, this.timeline.duration - 2);
    if (canResume && this.options.playback.resume === "ask") {
      this._showResumePrompt();
    } else if (canResume && this.options.playback.resume === "auto") {
      this.seek(this.saved.position);
      this._startSmartAutoplay();
    } else if (this.options.playback.autoplay === "smart") {
      this._startSmartAutoplay();
    }
  }
  _refreshDuration() {
    const sourceDuration = this.adapter?.getDuration?.() || 0;
    if (sourceDuration > 0) this.timeline.setDuration(sourceDuration);
    return this.timeline.duration;
  }
  _startSmartAutoplay() {
    this.mute();
    this.adapter?.play();
    this._showUnmutePrompt();
    window.setTimeout(() => {
      if (!this.destroyed && this.playerState !== YT_STATE.PLAYING) this._showAutoplayFallback();
    }, 1800);
  }
  _showUnmutePrompt() {
    const button = this._button("\u{1F50A}", this.options.locale.unmute, "yvsl-btn--accent");
    button.textContent = this.options.locale.unmute;
    this._listen(button, "click", () => this.unmute(true));
    this._showMessage("", [button]);
  }
  _showAutoplayFallback() {
    const button = this._button("\u25B6", this.options.locale.autoplayBlocked, "yvsl-btn--accent");
    button.textContent = this.options.locale.autoplayBlocked;
    this._listen(button, "click", () => {
      this._hideMessage();
      this.unmute(false);
      this.play();
    });
    this._showMessage("", [button]);
  }
  _showResumePrompt() {
    const continueButton = this._button("\u25B6", this.options.locale.continue, "yvsl-btn--accent");
    continueButton.textContent = this.options.locale.continue;
    const restartButton = this._button("\u21BA", this.options.locale.restart);
    restartButton.textContent = this.options.locale.restart;
    this._listen(continueButton, "click", () => {
      this.seek(this.saved.position);
      this.adapter?.unmute();
      this._hideMessage();
      this.play();
      this._emit("resume", { action: "continue", position: this.saved.position });
    });
    this._listen(restartButton, "click", () => {
      this.seek(0);
      this.adapter?.unmute();
      this._hideMessage();
      this.play();
      this._emit("resume", { action: "restart", position: 0 });
    });
    this._showMessage(this.options.locale.continueTitle, [continueButton, restartButton]);
  }
  _showMessage(text, buttons = []) {
    this.dom.message.replaceChildren();
    if (text) this.dom.message.append(element("span", "yvsl-message__text", { text }));
    this.dom.message.append(...buttons);
    this.dom.message.hidden = false;
  }
  _hideMessage() {
    this.dom.message.hidden = true;
    this.dom.message.replaceChildren();
  }
  _onStateChange(state) {
    if (this.destroyed) return;
    this.playerState = state;
    if (state === YT_STATE.PLAYING) {
      this.lastActiveAt = Date.now();
      this.completed = false;
      if (this.options.playback.singlePlayback) {
        for (const instance of instances) {
          if (instance !== this && instance.playerState === YT_STATE.PLAYING) instance.pause();
        }
      }
      this._startTicker();
      this._emit("play");
    } else {
      this._stopTicker();
      this.timeline.resetClock();
      this._tick();
      if (state === YT_STATE.PAUSED) {
        this._saveProgress();
        this._emit("pause");
      } else if (state === YT_STATE.ENDED) {
        this._complete();
      }
    }
    this._applySticky();
    this._updateUi();
  }
  _onRateChange(rate) {
    this.timeline.rate = Number(rate) || 1;
    if (this.dom.speed) this.dom.speed.value = String(this.timeline.rate);
  }
  _onPlayerError(code) {
    const locale = this.options.locale;
    let message = locale.genericError;
    if ([101, 150].includes(Number(code))) message = locale.embedError;
    if (Number(code) === 100) message = locale.unavailableError;
    if (Number(code) === 153) message = locale.identityError;
    this._showError(message, code);
  }
  _showError(message, code) {
    this.dom.error.textContent = message;
    this.dom.error.hidden = false;
    this.dom.controls.hidden = true;
    this._emit("error", { code, message });
  }
  _startTicker() {
    if (this.tickTimer) return;
    this.tickTimer = window.setInterval(() => this._tick(), 250);
  }
  _stopTicker() {
    if (!this.tickTimer) return;
    window.clearInterval(this.tickTimer);
    this.tickTimer = null;
  }
  _tick() {
    if (this.destroyed || !this.adapter || !this.readyState) return;
    if (!this.timeline.duration) this._refreshDuration();
    const observed = this.timeline.observe(this.adapter.getCurrentTime(), {
      playing: this.playerState === YT_STATE.PLAYING
    });
    if (observed.blocked) {
      this.adapter.seekTo(observed.correctionSourceTime);
      this.timeline.current = this.timeline.maxWatched;
      this.timeline.resetClock();
    }
    if (this.timeline.duration && this.timeline.current >= this.timeline.duration - 0.2) {
      this._complete();
    }
    this._updateUi();
    this._updateTimedItems();
    const now = Date.now();
    if (now - this.progressEventAt >= 1e3) {
      this.progressEventAt = now;
      this._emit("progress");
    }
    if (now - this.saveAt >= 5e3) {
      this.saveAt = now;
      this._saveProgress();
    }
  }
  _complete() {
    if (this.completed || !this.timeline.duration) return;
    this.completed = true;
    this.timeline.current = this.timeline.duration;
    this.timeline.grant(this.timeline.duration);
    this._updateUi();
    this._updateTimedItems();
    this._emit("complete");
    if (this.options.playback.loop) {
      this.completed = false;
      this.adapter.seekTo(this.options.playback.start);
      this.timeline.current = 0;
      this.timeline.resetClock();
      this.adapter.play();
    } else {
      this.adapter.pause();
      this._saveProgress({ position: 0 });
    }
  }
  _updateUi() {
    const playing = this.playerState === YT_STATE.PLAYING;
    this.dom.play.textContent = playing ? "\u2161" : "\u25B6";
    this.dom.play.title = playing ? this.options.locale.pause : this.options.locale.play;
    this.dom.play.setAttribute("aria-label", this.dom.play.title);
    const muted = this.adapter?.isMuted?.() ?? true;
    this.dom.volume.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
    this.dom.volume.title = muted ? this.options.locale.unmute : this.options.locale.mute;
    this.dom.volume.setAttribute("aria-label", this.dom.volume.title);
    const duration = this.timeline.duration || 0;
    const realFraction = duration ? clamp(this.timeline.current / duration, 0, 1) : 0;
    const visualFraction = this.options.progress.mode === "smart" ? interpolateProgress(realFraction, this.options.progress.points) : realFraction;
    this.dom.progress.value = String(Math.round(visualFraction * 1e3));
    this.dom.progress.setAttribute("aria-valuetext", formatTime(this.timeline.current));
    this.dom.time.textContent = formatTime(this.timeline.current);
  }
  _seekFromProgress() {
    if (!this.timeline.duration) return;
    const visual = Number(this.dom.progress.value) / 1e3;
    const real = this.options.progress.mode === "smart" ? invertProgress(visual, this.options.progress.points) : visual;
    this.seek(real * this.timeline.duration);
  }
  _populateRates() {
    const rates = this.adapter?.getAvailablePlaybackRates?.() || [1];
    this.dom.speed.replaceChildren(...rates.map((rate) => element("option", "", {
      value: rate,
      text: `${rate}\xD7`
    })));
    if (!rates.includes(this.options.playback.rate)) {
      this.dom.speed.append(element("option", "", { value: this.options.playback.rate, text: `${this.options.playback.rate}\xD7` }));
    }
    this.dom.speed.value = String(this.options.playback.rate);
  }
  _setRate(rate) {
    this.timeline.rate = Number(rate) || 1;
    this.adapter?.setPlaybackRate?.(this.timeline.rate);
  }
  _renderTimedItems() {
    for (const item of this.options.hooks) {
      const node = element("p", "yvsl-hook", { text: String(item.text || ""), hidden: true });
      this._zone(item.placement).append(node);
      this.timedNodes.push({ type: "hook", item, node, shown: false });
    }
    for (const item of this.options.ctas) {
      const safeUrl = toSafeUrl(item.url, location.href);
      const node = safeUrl ? element("a", "yvsl-cta", { text: String(item.text || "\u041F\u0435\u0440\u0435\u0439\u0442\u0438"), href: safeUrl, target: item.target || "_self" }) : element("button", "yvsl-cta", { text: String(item.text || "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435"), type: "button" });
      node.hidden = true;
      if (node.target === "_blank") node.rel = "noopener noreferrer";
      this._zone(item.placement).append(node);
      this.timedNodes.push({ type: "cta", item, node, shown: false });
      this._prepareReveal(item);
      this._listen(node, "click", () => {
        this._reveal(item);
        this._emit("cta-click", { cta: item.id, url: safeUrl });
      });
    }
    this._updateTimedItems();
  }
  _zone(placement) {
    return placement === "above" ? this.dom.above : this.dom.below;
  }
  _prepareReveal(item) {
    if (!item.reveal) return;
    let nodes = [];
    try {
      nodes = document.querySelectorAll(item.reveal);
    } catch {
      return;
    }
    for (const node of nodes) {
      if (!this.managedRevealElements.has(node)) this.managedRevealElements.set(node, node.hidden);
      if (!this.unlocks.has(item.id)) {
        node.hidden = true;
        node.setAttribute("aria-hidden", "true");
      }
    }
    if (this.unlocks.has(item.id)) this._reveal(item, false);
  }
  _reveal(item, persist = true) {
    if (item.reveal) {
      try {
        for (const node of document.querySelectorAll(item.reveal)) {
          node.hidden = false;
          node.removeAttribute("aria-hidden");
        }
      } catch {
      }
    }
    if (item.persist !== false && persist && !this.unlocks.has(item.id)) {
      this.unlocks.add(item.id);
      this._saveProgress();
    }
  }
  _updateTimedItems() {
    const current = this.timeline?.current || 0;
    for (const entry of this.timedNodes) {
      const { item, node, type } = entry;
      const unlocked = type === "cta" && item.persist !== false && this.unlocks.has(item.id);
      const active = unlocked || current >= item.start && current <= item.end;
      node.hidden = !active;
      if (active && !entry.shown) {
        entry.shown = true;
        if (type === "cta") {
          this._reveal(item);
          this._emit("cta-show", { cta: item.id });
          if (item.autoScroll) node.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (!active) {
        entry.shown = false;
        if (type === "cta" && item.persist === false && item.reveal) {
          try {
            for (const revealNode of document.querySelectorAll(item.reveal)) {
              revealNode.hidden = true;
              revealNode.setAttribute("aria-hidden", "true");
            }
          } catch {
          }
        }
      }
    }
  }
  _setupPopup() {
    const popup = this.options.popup;
    if (!popup) return;
    this.dom.root.hidden = true;
    if (typeof popup === "object" && popup.trigger) {
      for (const trigger of document.querySelectorAll(popup.trigger)) {
        this._listen(trigger, "click", (event) => {
          event.preventDefault();
          this.open();
        });
      }
    }
  }
  _createPopup() {
    if (this.dom.popupBackdrop) return;
    const backdrop = element("div", "yvsl-popup-backdrop", { hidden: true, role: "dialog", "aria-modal": "true" });
    const panel = element("div", "yvsl-popup-panel");
    const close = this._button("\xD7", this.options.locale.close, "yvsl-popup-close");
    backdrop.append(close, panel);
    document.body.append(backdrop);
    this.dom.popupBackdrop = backdrop;
    this.dom.popupPanel = panel;
    this.dom.popupClose = close;
    this._listen(close, "click", () => this.close());
    this._listen(backdrop, "click", (event) => {
      if (event.target === backdrop) this.close();
    });
    this._listen(document, "keydown", (event) => {
      if (event.key === "Escape" && this.popupOpen) this.close();
    });
  }
  _setupSticky() {
    if (!this.options.sticky || !globalThis.IntersectionObserver) return;
    this.stickyObserver = new IntersectionObserver(([entry]) => {
      this.stickyOutOfView = !entry.isIntersecting;
      this._applySticky();
    }, { threshold: 0 });
    this.stickyObserver.observe(this.dom.sentinel);
    if (typeof this.options.sticky === "object") {
      const position = this.options.sticky.position;
      if (position === "bottom-left") {
        this.dom.root.style.left = "18px";
        this.dom.root.style.right = "auto";
      }
      if (this.options.sticky.width) this.dom.root.style.setProperty("--yvsl-sticky-width", String(this.options.sticky.width));
    }
  }
  _applySticky() {
    const active = Boolean(
      this.options.sticky && this.stickyOutOfView && !this.stickyDismissed && !this.popupOpen && document.fullscreenElement !== this.dom.root && this.playerState === YT_STATE.PLAYING
    );
    this.dom.root.classList.toggle("yvsl-root--sticky", active);
  }
  _dismissSticky() {
    this.stickyDismissed = true;
    this.dom.root.classList.remove("yvsl-root--sticky");
    this.pause();
  }
  _toggleFullscreen() {
    if (document.fullscreenElement === this.dom.root) {
      const result = document.exitFullscreen?.();
      result?.then?.(() => this._updateFullscreenButton());
    } else {
      this.dom.root.requestFullscreen?.().then(() => this._updateFullscreenButton()).catch((error) => this._emit("error", { code: "fullscreen", message: error.message }));
    }
  }
  _updateFullscreenButton() {
    const active = document.fullscreenElement === this.dom.root;
    this._applySticky();
    this.dom.fullscreen.textContent = active ? "\xD7" : "\u26F6";
    this.dom.fullscreen.title = active ? this.options.locale.exitFullscreen : this.options.locale.fullscreen;
    this.dom.fullscreen.setAttribute("aria-label", this.dom.fullscreen.title);
  }
  _bindLifecycle() {
    this._listen(window, "pagehide", () => this._saveProgress());
  }
  _listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.cleanup.push(() => target.removeEventListener(event, handler, options));
  }
  _saveProgress(overrides = {}) {
    if (!this.storage || !this.timeline) return;
    const existing = this.storage.load();
    const activeAt = Math.max(this.lastActiveAt, Number(overrides.activeAt) || 0);
    const ownsPosition = Object.prototype.hasOwnProperty.call(overrides, "position") || activeAt >= (existing.activeAt || 0);
    this.storage.save({
      position: ownsPosition ? this.completed ? 0 : this.timeline.current : existing.position,
      maxWatched: Math.max(existing.maxWatched || 0, this.timeline.maxWatched),
      unlocks: [.../* @__PURE__ */ new Set([...existing.unlocks || [], ...this.unlocks])],
      activeAt: Math.max(existing.activeAt || 0, activeAt),
      ...overrides
    });
  }
  _emit(name, extra = {}) {
    if (!this.dom?.root) return;
    const detail = {
      instance: this,
      videoId: this.videoId,
      currentTime: this.timeline?.current || 0,
      duration: this.timeline?.duration || 0,
      maxWatched: this.timeline?.maxWatched || 0,
      ...extra
    };
    this.dom.root.dispatchEvent(new CustomEvent(`yellowvsl:${name}`, { detail, bubbles: true }));
  }
  play() {
    this.adapter?.play();
    return this;
  }
  pause() {
    this.adapter?.pause();
    return this;
  }
  mute() {
    this.adapter?.mute();
    this._updateUi();
    return this;
  }
  unmute(restart = false) {
    if (restart) this.seek(0);
    this.adapter?.unmute();
    this._hideMessage();
    this.play();
    this._updateUi();
    return this;
  }
  seek(seconds) {
    const sourceTime = this.timeline.seek(seconds);
    const logicalTime = sourceTime - this.timeline.start;
    const generation = ++this.seekGeneration;
    this.adapter?.seekTo(sourceTime);
    this.timeline.current = logicalTime;
    this._updateUi();
    this._updateTimedItems();
    for (const delay of [100, 400, 900]) {
      window.setTimeout(() => {
        if (!this.destroyed && generation === this.seekGeneration) this._tick();
      }, delay);
    }
    return logicalTime;
  }
  open() {
    this._createPopup();
    for (const instance of instances) {
      if (instance !== this && instance.playerState === YT_STATE.PLAYING) instance.pause();
    }
    this.popupOpen = true;
    this.dom.root.classList.remove("yvsl-root--sticky");
    this.dom.root.hidden = false;
    this.dom.popupPanel.append(this.dom.root);
    this.dom.popupBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    this.dom.popupClose.focus();
    return this;
  }
  close() {
    if (!this.popupOpen) return this;
    this.pause();
    this.popupOpen = false;
    this.mount.append(this.dom.root);
    this.dom.popupBackdrop.hidden = true;
    document.body.style.overflow = "";
    if (this.options.popup) this.dom.root.hidden = true;
    this._applySticky();
    return this;
  }
  getState() {
    return {
      id: this.id,
      videoId: this.videoId,
      ready: this.readyState,
      playerState: this.playerState,
      currentTime: this.timeline.current,
      duration: this.timeline.duration,
      maxWatched: this.timeline.maxWatched,
      muted: this.adapter?.isMuted?.() ?? true,
      rate: this.timeline.rate,
      popupOpen: this.popupOpen,
      sticky: this.dom.root.classList.contains("yvsl-root--sticky")
    };
  }
  destroy() {
    if (this.destroyed) return;
    this._saveProgress();
    this.destroyed = true;
    this._stopTicker();
    this.stickyObserver?.disconnect();
    this.adapter?.destroy();
    for (const dispose of this.cleanup.splice(0)) dispose();
    for (const [node, originallyHidden] of this.managedRevealElements) {
      node.hidden = originallyHidden;
      if (!originallyHidden) node.removeAttribute("aria-hidden");
    }
    this.dom.popupBackdrop?.remove();
    document.body.style.overflow = "";
    this.mount.replaceChildren(...this.originalNodes);
    instances.delete(this);
  }
};
function safeLocalStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

// src/index.js
var version = "1.1.0";
var autoInstances = /* @__PURE__ */ new WeakMap();
function create(target, options = {}) {
  return new YellowVSLPlayer(target, options);
}
function autoInit(root = document) {
  const nodes = [];
  if (root instanceof Element && root.matches("[data-yellow-vsl]")) nodes.push(root);
  nodes.push(...root.querySelectorAll("[data-yellow-vsl]"));
  return nodes.map((node) => {
    if (autoInstances.has(node)) return autoInstances.get(node);
    try {
      const instance = create(node, optionsFromDataset(node));
      autoInstances.set(node, instance);
      return instance;
    } catch (error) {
      node.dispatchEvent(new CustomEvent("yellowvsl:error", {
        detail: { code: "config", message: error.message },
        bubbles: true
      }));
      node.textContent = error.message;
      node.setAttribute("role", "alert");
      return null;
    }
  }).filter(Boolean);
}
var api = { create, autoInit, version };
if (typeof window !== "undefined") {
  window.YellowVSL = Object.assign(window.YellowVSL || {}, api);
}
export {
  DEFAULT_PROGRESS_POINTS,
  YellowVSLPlayer,
  autoInit,
  create,
  formatTime,
  interpolateProgress,
  invertProgress,
  normalizeOptions,
  parseYouTubeId,
  validateProgressPoints,
  version
};
//# sourceMappingURL=yellow-vsl.esm.js.map
