/*! YellowVSL v1.8.2 | MIT License | https://github.com/dvygolov/yellow-vsl */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    DEFAULT_PROGRESS_POINTS: () => DEFAULT_PROGRESS_POINTS,
    YellowVSLPlayer: () => YellowVSLPlayer,
    autoInit: () => autoInit,
    create: () => create,
    formatTime: () => formatTime,
    interpolateProgress: () => interpolateProgress,
    invertProgress: () => invertProgress,
    normalizeOptions: () => normalizeOptions,
    parseYouTubeId: () => parseYouTubeId,
    validateProgressPoints: () => validateProgressPoints,
    version: () => version
  });

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
    const numeric = points.map((point) => {
      if (!Array.isArray(point) || point.length !== 2) {
        throw new TypeError("\u041A\u0430\u0436\u0434\u0430\u044F \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430 progress.points \u0434\u043E\u043B\u0436\u043D\u0430 \u0438\u043C\u0435\u0442\u044C \u0444\u043E\u0440\u043C\u0430\u0442 [real, visual]");
      }
      const x = Number(point[0]);
      const y = Number(point[1]);
      return [x, y];
    });
    const percentageScale = numeric.some(([x, y]) => x > 1 || y > 1);
    const maximum = percentageScale ? 100 : 1;
    const normalized = numeric.map(([x, y]) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > maximum || y < 0 || y > maximum) {
        throw new RangeError("\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B progress.points \u0434\u043E\u043B\u0436\u043D\u044B \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u0432 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0435 \u043E\u0442 0 \u0434\u043E 1 \u0438\u043B\u0438 \u043E\u0442 0 \u0434\u043E 100");
      }
      return percentageScale ? [x / 100, y / 100] : [x, y];
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
    unmute: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A",
    unmutePrompt: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A \u0438 \u043D\u0430\u0447\u0430\u0442\u044C \u0441\u043D\u0430\u0447\u0430\u043B\u0430",
    fullscreen: "\u041D\u0430 \u0432\u0435\u0441\u044C \u044D\u043A\u0440\u0430\u043D",
    exitFullscreen: "\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430",
    progress: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430",
    continueTitle: "\u0412\u044B \u0443\u0436\u0435 \u043D\u0430\u0447\u0430\u043B\u0438 \u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u044D\u0442\u043E \u0432\u0438\u0434\u0435\u043E",
    continue: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
    restart: "\u041D\u0430\u0447\u0430\u0442\u044C \u0441\u043D\u0430\u0447\u0430\u043B\u0430",
    autoplayBlocked: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E",
    loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0432\u0438\u0434\u0435\u043E",
    captionsEnable: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B",
    captionsDisable: "\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B",
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
      captions: true,
      speed: false
    }),
    captions: Object.freeze({
      enabled: "auto",
      language: null
    }),
    youtubeUi: "clean",
    stage: Object.freeze({
      poster: "auto",
      clickToToggle: true,
      revealDelay: 0
    }),
    aspectRatio: "16/9",
    sticky: false,
    popup: false,
    ctas: Object.freeze([]),
    hooks: Object.freeze([]),
    reveals: Object.freeze([]),
    theme: Object.freeze({}),
    locale: DEFAULT_LOCALE
  });
  function normalizeTimedItem(item, index, kind) {
    const start = Math.max(0, Number(item?.start) || 0);
    const rawEnd = item?.end == null ? Infinity : Number(item.end);
    const end = Number.isFinite(rawEnd) ? Math.max(start, rawEnd) : Infinity;
    const placements = ["above", "below", "top-left", "top-right", "bottom-left", "bottom-right"];
    const placement = placements.includes(item?.placement) ? item.placement : "below";
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
    playback.start = Number(playback.start);
    playback.end = playback.end == null ? null : Number(playback.end);
    if (!Number.isFinite(playback.start) || playback.start < 0 || playback.end != null && (!Number.isFinite(playback.end) || playback.end <= playback.start)) {
      throw new RangeError("playback.start \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435\u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C, \u0430 playback.end \u2014 \u0431\u043E\u043B\u044C\u0448\u0435 start");
    }
    playback.rate = clamp(playback.rate, 0.25, 2);
    playback.autoplay = playback.autoplay === false ? false : "smart";
    playback.noSeek = playback.noSeek === false ? false : "forward";
    playback.resume = ["ask", "auto", false].includes(playback.resume) ? playback.resume : "ask";
    const progress = { ...DEFAULT_OPTIONS.progress, ...options.progress || {} };
    progress.mode = ["smart", "real", "hidden"].includes(progress.mode) ? progress.mode : "smart";
    progress.points = validateProgressPoints(progress.points || DEFAULT_PROGRESS_POINTS);
    const controls = { ...DEFAULT_OPTIONS.controls, ...options.controls || {} };
    if (progress.mode === "hidden") controls.progress = false;
    const captions = { ...DEFAULT_OPTIONS.captions, ...options.captions || {} };
    captions.enabled = [true, false, "auto"].includes(captions.enabled) ? captions.enabled : "auto";
    captions.language = typeof captions.language === "string" && captions.language.trim() ? captions.language.trim().toLowerCase() : null;
    const youtubeUi = options.youtubeUi === "native" ? "native" : "clean";
    const stage = { ...DEFAULT_OPTIONS.stage, ...options.stage || {} };
    stage.poster = stage.poster === false ? false : typeof stage.poster === "string" ? stage.poster : "auto";
    stage.clickToToggle = stage.clickToToggle !== false;
    stage.revealDelay = clamp(stage.revealDelay, 0, 1e4);
    return {
      ...DEFAULT_OPTIONS,
      ...options,
      video: options.video,
      storageKey: typeof options.storageKey === "string" ? options.storageKey.trim() : null,
      playback,
      progress,
      controls,
      captions,
      youtubeUi,
      stage,
      aspectRatio: options.aspectRatio || DEFAULT_OPTIONS.aspectRatio,
      aspectRatioValue: parseAspectRatio(options.aspectRatio || DEFAULT_OPTIONS.aspectRatio),
      ctas: Array.isArray(options.ctas) ? options.ctas.map((item, index) => normalizeTimedItem(item, index, "cta")) : [],
      hooks: Array.isArray(options.hooks) ? options.hooks.map((item, index) => normalizeTimedItem(item, index, "hook")) : [],
      reveals: Array.isArray(options.reveals) ? options.reveals.map((item, index) => ({
        ...normalizeTimedItem(item, index, "reveal"),
        selector: String(item?.selector || item?.reveal || "")
      })) : [],
      theme: { ...options.theme || {} },
      locale: { ...DEFAULT_LOCALE, ...options.locale || {} }
    };
  }
  function optionsFromDataset(element2) {
    const dataset = element2.dataset;
    const playback = {};
    const progress = {};
    const stage = {};
    const captions = {};
    if (dataset.autoplay === "false") playback.autoplay = false;
    if (dataset.resume === "false") playback.resume = false;
    if (dataset.resume === "auto") playback.resume = "auto";
    if (dataset.start != null) playback.start = Number(dataset.start);
    if (dataset.end != null) playback.end = Number(dataset.end);
    if (dataset.loop === "true") playback.loop = true;
    if (dataset.rate != null) playback.rate = Number(dataset.rate);
    if (dataset.noSeek === "false") playback.noSeek = false;
    if (dataset.progress) progress.mode = dataset.progress;
    if (dataset.revealDelay != null) stage.revealDelay = Number(dataset.revealDelay);
    if (dataset.captions === "true") captions.enabled = true;
    if (dataset.captions === "false") captions.enabled = false;
    if (dataset.captions === "auto") captions.enabled = "auto";
    if (dataset.captionsLanguage) captions.language = dataset.captionsLanguage;
    return {
      video: dataset.video,
      storageKey: dataset.storageKey,
      aspectRatio: dataset.aspectRatio,
      playback,
      progress,
      stage,
      captions,
      youtubeUi: dataset.youtubeUi,
      sticky: dataset.sticky === "true",
      popup: dataset.popupTrigger ? { trigger: dataset.popupTrigger } : false
    };
  }

  // src/youtube-api.js
  var API_URL = "https://www.youtube.com/iframe_api";
  var apiLoads = /* @__PURE__ */ new WeakMap();
  function loadYouTubeAPI(win = globalThis.window) {
    if (!win?.document) return Promise.reject(new Error("YouTube API \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435"));
    if (win.YT?.Player) return Promise.resolve(win.YT);
    if (apiLoads.has(win)) return apiLoads.get(win);
    const apiPromise = new Promise((resolve, reject) => {
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
          apiLoads.delete(win);
          script.remove?.();
          reject(new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C YouTube IFrame API"));
        }, { once: true });
        (win.document.head || win.document.documentElement).append(script);
      }
      pollTimer = win.setInterval(finish, 50);
      timeoutTimer = win.setTimeout(() => {
        if (settled) return;
        settled = true;
        win.clearInterval(pollTimer);
        apiLoads.delete(win);
        script.remove?.();
        reject(new Error("YouTube IFrame API \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0432\u043E\u0432\u0440\u0435\u043C\u044F"));
      }, 2e4);
    });
    apiLoads.set(win, apiPromise);
    return apiPromise;
  }
  var YouTubeAdapter = class {
    constructor({ element: element2, videoId, playerVars = {}, events = {}, win = globalThis.window, timeout = 2e4 }) {
      this.element = element2;
      this.videoId = videoId;
      this.playerVars = playerVars;
      this.events = events;
      this.win = win;
      this.player = null;
      this.destroyed = false;
      this.timeout = timeout;
      this.cancelMount = null;
      this.cancelLoad = null;
    }
    async mount() {
      if (this.destroyed) throw abortError();
      let YT;
      try {
        YT = await Promise.race([
          loadYouTubeAPI(this.win),
          new Promise((resolve, reject) => {
            this.cancelLoad = () => reject(abortError());
          })
        ]);
      } finally {
        this.cancelLoad = null;
      }
      if (this.destroyed) throw abortError();
      await new Promise((resolve, reject) => {
        let isReady = false;
        let settled = false;
        const clock = this.win.setTimeout ? this.win : globalThis;
        const finish = (error) => {
          if (settled) return;
          settled = true;
          clock.clearTimeout(timer);
          this.cancelMount = null;
          if (error) reject(error);
          else resolve();
        };
        const timer = clock.setTimeout(() => {
          const error = new Error("YouTube Player \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0432\u043E\u0432\u0440\u0435\u043C\u044F");
          error.code = "ready-timeout";
          finish(error);
        }, this.timeout);
        this.cancelMount = () => finish(abortError());
        try {
          this.player = new YT.Player(this.element, {
            videoId: this.videoId,
            width: "100%",
            height: "100%",
            playerVars: this.playerVars,
            events: {
              onReady: (event) => {
                if (this.destroyed || settled) return;
                isReady = true;
                try {
                  this.events.ready?.(event);
                  finish();
                } catch (error) {
                  finish(error);
                }
              },
              onStateChange: (event) => {
                if (!this.destroyed) this.events.stateChange?.(event.data, event);
              },
              onPlaybackRateChange: (event) => {
                if (!this.destroyed) this.events.rateChange?.(event.data, event);
              },
              onApiChange: (event) => {
                if (!this.destroyed) this.events.apiChange?.(event);
              },
              onAutoplayBlocked: (event) => {
                if (!this.destroyed) this.events.autoplayBlocked?.(event);
              },
              onError: (event) => {
                if (this.destroyed) return;
                this.events.error?.(event.data, event);
                if (!isReady) {
                  const error = new Error(`YouTube Player error: ${event.data}`);
                  error.code = event.data;
                  finish(error);
                }
              }
            }
          });
        } catch (error) {
          finish(error);
        }
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
    seekTo(seconds, allowSeekAhead = true) {
      this.player?.seekTo?.(seconds, allowSeekAhead);
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
    getCaptionTracks() {
      try {
        const tracks = this.player?.getOption?.("captions", "tracklist");
        return Array.isArray(tracks) ? tracks : [];
      } catch {
        return [];
      }
    }
    getCaptionTrack() {
      try {
        return this.player?.getOption?.("captions", "track") || {};
      } catch {
        return {};
      }
    }
    setCaptionTrack(track) {
      try {
        this.player?.setOption?.("captions", "track", track || {});
      } catch {
      }
    }
    reloadCaptions() {
      try {
        this.player?.setOption?.("captions", "reload", true);
      } catch {
      }
    }
    destroy() {
      this.destroyed = true;
      this.cancelLoad?.();
      this.cancelMount?.();
      this.player?.destroy?.();
      this.player = null;
    }
  };
  function abortError() {
    const error = new Error("YouTube Player initialization cancelled");
    error.name = "AbortError";
    return error;
  }
  var YT_STATE = Object.freeze({
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  });

  // src/sticky.js
  var StickyController = class {
    constructor(player) {
      this.player = player;
      this.dismissed = false;
      this.outOfView = false;
    }
    setup() {
      if (!this.player.options.sticky || !globalThis.IntersectionObserver) return;
      this.observer = new IntersectionObserver(([entry]) => {
        this.outOfView = !entry.isIntersecting;
        this.apply();
      }, { threshold: 0 });
      this.observer.observe(this.player.dom.sentinel);
      if (typeof this.player.options.sticky === "object") {
        const position = this.player.options.sticky.position;
        if (position === "bottom-left") {
          this.player.dom.root.style.left = "18px";
          this.player.dom.root.style.right = "auto";
        }
        if (this.player.options.sticky.width) this.player.dom.root.style.setProperty("--yvsl-sticky-width", String(this.player.options.sticky.width));
      }
    }
    apply() {
      const active = Boolean(
        this.player.options.sticky && this.outOfView && !this.dismissed && !this.player.popupOpen && document.fullscreenElement !== this.player.dom.root && this.player.hasStarted && [YT_STATE.PLAYING, YT_STATE.PAUSED, YT_STATE.BUFFERING].includes(this.player.playerState)
      );
      this.player.dom.root.classList.toggle("yvsl-root--sticky", active);
    }
    dismiss() {
      this.dismissed = true;
      this.player.dom.root.classList.remove("yvsl-root--sticky");
      this.player.pause();
    }
  };

  // src/instances.js
  var instances = /* @__PURE__ */ new Set();

  // src/captions.js
  var CaptionController = class {
    constructor(player) {
      this.player = player;
      this.tracks = [];
      this.enabled = false;
      this.language = null;
      this.initialized = false;
      this.intent = null;
      this.probeTimer = null;
      this.moduleReady = false;
      this.applyTimer = null;
    }
    onApiChange() {
      if (this.player.destroyed || this.player.failed || !this.player.adapter) return;
      const tracks = this.player.adapter.getCaptionTracks?.() || [];
      const captionTracks = tracks.filter((track) => track && typeof track.languageCode === "string");
      if (!captionTracks.length) {
        if (!this.tracks.length) {
          this.enabled = false;
          this.player.dom.captions.hidden = true;
          this.updateButton();
        }
        return;
      }
      this.applyTracks(captionTracks, true);
      for (const instance of instances) {
        if (instance !== this.player && !instance.destroyed && instance.videoId === this.player.videoId && instance.adapter && !instance.captions.tracks.length) {
          instance.captions.applyTracks(captionTracks, false);
        }
      }
    }
    applyTracks(tracks, moduleReady = false) {
      if (this.player.destroyed || this.player.failed) return;
      this.tracks = tracks;
      if (moduleReady) {
        this.moduleReady = true;
        this.stopProbe();
      }
      const activeTrack = moduleReady ? this.player.adapter.getCaptionTrack?.() || {} : {};
      const activeLanguage = typeof activeTrack.languageCode === "string" ? activeTrack.languageCode : null;
      const desiredState = this.intent ?? this.player.options.captions.enabled;
      if (!this.initialized) {
        this.initialized = true;
        this.language = this.language || this.player.options.captions.language || activeLanguage || this.tracks[0].languageCode;
        this.enabled = desiredState === "auto" ? Boolean(activeLanguage) : desiredState;
      } else if (moduleReady && desiredState === "auto") {
        this.enabled = Boolean(activeLanguage);
        this.language = activeLanguage || this.language || this.player.options.captions.language || this.tracks[0].languageCode;
      }
      if (desiredState !== "auto") this.scheduleApply(desiredState);
      this.player.dom.captions.hidden = !this.player.options.controls.captions;
      this.updateButton();
    }
    startProbe() {
      if (this.player.destroyed || this.moduleReady || this.probeTimer) return;
      let attempts = 0;
      const probe = () => {
        this.probeTimer = null;
        if (this.player.destroyed || this.moduleReady) return;
        attempts += 1;
        if (attempts === 1 || attempts === 8) this.player.adapter?.reloadCaptions?.();
        this.onApiChange();
        if (!this.moduleReady && attempts < 20) {
          this.probeTimer = this.player.timers.timeout(probe, 250);
        }
      };
      this.probeTimer = this.player.timers.timeout(probe, 0);
    }
    stopProbe() {
      if (!this.probeTimer) return;
      this.player.timers.clear(this.probeTimer);
      this.probeTimer = null;
    }
    applyState(enabled) {
      if (!this.player.adapter) return false;
      if (!enabled) {
        this.player.adapter.setCaptionTrack?.(null);
        this.player.loop.mirror?.setCaptionTrack?.(null);
        return true;
      }
      const track = this.track();
      if (!track) return false;
      this.language = track.languageCode;
      this.player.adapter.setCaptionTrack?.({ languageCode: track.languageCode });
      this.player.loop.mirror?.setCaptionTrack?.({ languageCode: track.languageCode });
      return true;
    }
    scheduleApply(enabled) {
      this.stopApply();
      if (!this.applyState(enabled)) {
        this.startProbe();
        return;
      }
      let attempt = 1;
      const retry = () => {
        this.applyTimer = null;
        const desiredState = this.intent ?? this.player.options.captions.enabled;
        if (this.player.destroyed || desiredState !== enabled) return;
        this.applyState(enabled);
        attempt += 1;
        if (attempt < 4) this.applyTimer = this.player.timers.timeout(retry, attempt * 300);
      };
      this.applyTimer = this.player.timers.timeout(retry, 250);
    }
    syncIntent() {
      const desiredState = this.intent ?? this.player.options.captions.enabled;
      if (desiredState !== "auto") this.scheduleApply(desiredState);
    }
    stopApply() {
      if (!this.applyTimer) return;
      this.player.timers.clear(this.applyTimer);
      this.applyTimer = null;
    }
    track(language = null) {
      const requested = language || this.language || this.player.options.captions.language;
      const normalized = typeof requested === "string" ? requested.toLowerCase() : null;
      return this.tracks.find((track) => track.languageCode.toLowerCase() === normalized) || this.tracks.find((track) => track.languageCode.toLowerCase().split("-")[0] === normalized?.split("-")[0]) || this.tracks[0] || null;
    }
    updateButton() {
      if (!this.player.dom?.captions) return;
      const label = this.enabled ? this.player.options.locale.captionsDisable : this.player.options.locale.captionsEnable;
      this.player.dom.captions.title = label;
      this.player.dom.captions.setAttribute("aria-label", label);
      this.player.dom.captions.setAttribute("aria-pressed", String(this.enabled));
      this.updateUiMode();
    }
    updateUiMode() {
      if (!this.player.dom?.root) return;
      const clean = this.player.options.youtubeUi === "clean" && !this.enabled;
      this.player.dom.root.classList.toggle("yvsl-root--clean-youtube", clean);
    }
    enable(language = null) {
      if (this.player.destroyed || this.player.failed) return this.player;
      this.intent = true;
      if (typeof language === "string" && language.trim()) this.language = language.trim().toLowerCase();
      const track = this.track(language);
      if (!track || !this.player.adapter) return this.player;
      this.language = track.languageCode;
      this.enabled = true;
      this.scheduleApply(true);
      this.updateButton();
      this.player._emit("captions", { enabled: true, language: this.language });
      return this.player;
    }
    disable() {
      if (this.player.destroyed || this.player.failed) return this.player;
      this.intent = false;
      this.enabled = false;
      this.scheduleApply(false);
      this.updateButton();
      this.player._emit("captions", { enabled: false, language: this.language });
      return this.player;
    }
    toggle() {
      return this.enabled ? this.disable() : this.enable();
    }
  };

  // src/loop.js
  var LoopController = class {
    constructor(player) {
      this.player = player;
      this.restarting = false;
      this.mirror = null;
      this.mirrorState = YT_STATE.UNSTARTED;
      this.ready = false;
      this.preparing = false;
      this.active = false;
      this.token = 0;
    }
    prepare() {
      if (this.player.destroyed || this.player.failed || this.player.playbackIntent === "paused" || !this.player.options.playback.loop || !this.mirror || this.ready || this.preparing || this.active) return;
      this.preparing = true;
      const token = ++this.token;
      const mirror = this.mirror;
      const start = this.player.options.playback.start;
      mirror.mute();
      mirror.setVolume?.(this.player.adapter?.getVolume?.() ?? 100);
      mirror.setPlaybackRate?.(this.player.timeline.rate);
      mirror.seekTo(start, true);
      mirror.play();
      this.player.captions.applyState(this.player.captions.enabled);
      const startedAt = Date.now();
      const inspect = () => {
        if (this.player.destroyed || token !== this.token || this.active) return;
        const current = mirror.getCurrentTime?.() ?? start;
        if (mirror.getState?.() === YT_STATE.PLAYING && current >= start + 0.04) {
          mirror.pause();
          this.ready = true;
          this.preparing = false;
          return;
        }
        if (Date.now() - startedAt >= 3500) {
          mirror.pause();
          this.ready = false;
          this.preparing = false;
          return;
        }
        this.player.timers.timeout(inspect, 30);
      };
      this.player.timers.timeout(inspect, 30);
    }
    startTransition() {
      if (!this.mirror?.play || !this.ready || this.active) return false;
      const primary = this.player.adapter;
      const mirror = this.mirror;
      const start = this.player.options.playback.start;
      const token = ++this.token;
      const mirrorStart = mirror.getCurrentTime?.() ?? start;
      this.ready = false;
      this.preparing = false;
      this.active = true;
      mirror.setVolume?.(primary.getVolume?.() ?? 100);
      mirror.setPlaybackRate?.(this.player.timeline.rate);
      mirror.mute();
      mirror.play();
      const startedAt = Date.now();
      const restorePrimary = (ready = true) => {
        if (token !== this.token) return;
        if (!ready) {
          this.player.stageRevealed = false;
          this.player.stageWasRevealedBeforeBuffering = false;
          this.player._updateUi();
        }
        this.player.dom.loopMirror.classList.remove("yvsl-loop-mirror--visible");
        mirror.mute();
        mirror.pause();
        this.active = false;
        this.player._syncMutedIntent();
        this.player.timers.timeout(() => this.prepare(), 80);
      };
      let primaryStableSince = null;
      let primaryLastTime = null;
      let advancingSamples = 0;
      const waitForPrimary = () => {
        if (this.player.destroyed || token !== this.token) return;
        const current = primary.getCurrentTime?.() ?? start;
        const playingAtStart = primary.getState?.() === YT_STATE.PLAYING && current >= start && current < start + 2;
        if (!playingAtStart) {
          primaryStableSince = null;
          advancingSamples = 0;
        } else {
          primaryStableSince ?? (primaryStableSince = Date.now());
          if (primaryLastTime != null && current > primaryLastTime + 0.015) advancingSamples++;
        }
        primaryLastTime = current;
        const ready = playingAtStart && advancingSamples >= 2 && Date.now() - primaryStableSince >= 250;
        if (ready || Date.now() - startedAt >= 3e3) {
          restorePrimary(ready);
          return;
        }
        this.player.timers.timeout(waitForPrimary, 30);
      };
      const revealMirror = () => {
        if (this.player.destroyed || token !== this.token) return;
        const current = mirror.getCurrentTime?.() ?? mirrorStart;
        const ready = mirror.getState?.() === YT_STATE.PLAYING && current >= mirrorStart + 0.03;
        if (ready) {
          this.player.captions.applyState(this.player.captions.enabled);
          if (!this.player._isMuted()) {
            primary.mute();
            mirror.unmute();
          }
          this.player.dom.loopMirror.classList.add("yvsl-loop-mirror--visible");
          primary.seekTo(start, true);
          this.player.timers.timeout(waitForPrimary, 30);
          return;
        }
        if (Date.now() - startedAt >= 1200) {
          this.active = false;
          mirror.mute();
          mirror.pause();
          primary.seekTo(start, true);
          this.player._syncMutedIntent();
          return;
        }
        this.player.timers.timeout(revealMirror, 30);
      };
      this.player.timers.timeout(revealMirror, 30);
      return true;
    }
    cancel() {
      this.token += 1;
      this.active = false;
      this.preparing = false;
      this.ready = false;
      this.player.dom.loopMirror?.classList.remove("yvsl-loop-mirror--visible");
      this.mirror?.mute?.();
      this.mirror?.pause?.();
      this.player._syncMutedIntent();
    }
  };

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
  function createStorageKey(videoId, start, end, identity = null) {
    return `yellowvsl:v2:${JSON.stringify([identity, videoId, start, end])}`;
  }

  // src/player-storage.js
  var owners = /* @__PURE__ */ new WeakMap();
  var MemoryStorage = class {
    constructor() {
      this.values = /* @__PURE__ */ new Map();
    }
    getItem(key) {
      return this.values.get(key) ?? null;
    }
    setItem(key, value) {
      this.values.set(key, value);
    }
    removeItem(key) {
      this.values.delete(key);
    }
  };
  var PlayerProgress = class {
    constructor({ mount, options, videoId, storage }) {
      const doc = mount.ownerDocument;
      const identity = options.storageKey || mount.id;
      let registered = owners.get(doc);
      if (!registered) {
        registered = /* @__PURE__ */ new Set();
        owners.set(doc, registered);
      }
      const page = doc.defaultView.location.pathname;
      this.ownerKey = identity ? JSON.stringify([page, identity]) : null;
      if (this.ownerKey && registered.has(this.ownerKey)) {
        throw new TypeError("storageKey / id \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u043C \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u044D\u043A\u0437\u0435\u043C\u043F\u043B\u044F\u0440\u0430 YellowVSL");
      }
      if (this.ownerKey) registered.add(this.ownerKey);
      this.release = () => {
        if (this.ownerKey) registered.delete(this.ownerKey);
      };
      let backend = storage;
      if (backend === void 0) {
        try {
          backend = doc.defaultView.localStorage;
        } catch {
          backend = null;
        }
      }
      this.storage = new ProgressStorage(
        identity && backend ? backend : new MemoryStorage(),
        createStorageKey(videoId, options.playback.start, options.playback.end, this.ownerKey)
      );
    }
    save(player, overrides = {}) {
      const existing = this.storage.load();
      this.storage.save({
        position: player.completed ? 0 : player.timeline.current,
        maxWatched: Math.max(existing.maxWatched, player.timeline.maxWatched),
        unlocks: [.../* @__PURE__ */ new Set([...existing.unlocks, ...player.unlocks])],
        activeAt: player.lastActiveAt,
        ...overrides
      });
    }
  };
  function unlockKey(item) {
    return JSON.stringify([
      item.id,
      item.start,
      Number.isFinite(item.end) ? item.end : null,
      item.selector || item.reveal || "",
      item.url || "",
      item.text || "",
      item.persist !== false
    ]);
  }

  // src/timers.js
  var TimerRegistry = class {
    constructor(clock = globalThis.window) {
      this.clock = clock;
      this.pending = /* @__PURE__ */ new Map();
      this.disposed = false;
    }
    timeout(callback, delay) {
      if (this.disposed) return null;
      const id = this.clock.setTimeout(() => {
        this.pending.delete(id);
        callback();
      }, delay);
      this.pending.set(id, "timeout");
      return id;
    }
    interval(callback, delay) {
      if (this.disposed) return null;
      const id = this.clock.setInterval(callback, delay);
      this.pending.set(id, "interval");
      return id;
    }
    clear(id) {
      if (id == null) return;
      this.clock.clearTimeout(id);
      this.clock.clearInterval(id);
      this.pending.delete(id);
    }
    clearAll() {
      for (const id of this.pending.keys()) this.clear(id);
    }
    dispose() {
      this.disposed = true;
      this.clearAll();
    }
  };

  // src/modal.js
  var documents = /* @__PURE__ */ new WeakMap();
  function stateFor(doc) {
    if (!documents.has(doc)) documents.set(doc, { stack: [], overflow: "" });
    return documents.get(doc);
  }
  var ModalController = class {
    constructor(owner) {
      this.owner = owner;
      this.previousFocus = null;
    }
    acquire() {
      const doc = this.owner.mount.ownerDocument;
      const state = stateFor(doc);
      if (state.stack.includes(this)) return;
      this.previousFocus = doc.activeElement;
      if (!state.stack.length) state.overflow = doc.body.style.overflow;
      state.stack.push(this);
      doc.body.style.overflow = "hidden";
    }
    release() {
      const doc = this.owner.mount.ownerDocument;
      const state = stateFor(doc);
      const index = state.stack.indexOf(this);
      if (index < 0) return;
      const wasTop = index === state.stack.length - 1;
      state.stack.splice(index, 1);
      if (!state.stack.length) doc.body.style.overflow = state.overflow;
      if (wasTop) {
        const top = state.stack.at(-1);
        if (top) top.owner.dom.popupClose.focus();
        else if (this.previousFocus?.isConnected) this.previousFocus.focus();
      }
    }
    handleKey(event) {
      const { owner } = this;
      const doc = owner.mount.ownerDocument;
      if (!owner.popupOpen || stateFor(doc).stack.at(-1) !== this) return;
      if (event.key === "Escape") {
        event.preventDefault();
        owner.close();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = [...owner.dom.popupBackdrop.querySelectorAll("button, a[href], input, select, [tabindex]")].filter((node) => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length && !node.closest('[hidden], [aria-hidden="true"]'));
      if (!nodes.length) return;
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && (doc.activeElement === first || !nodes.includes(doc.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (doc.activeElement === last || !nodes.includes(doc.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
  };

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
  position: relative;
  width: 100%;
  aspect-ratio: var(--yvsl-aspect, 16 / 9);
  overflow: hidden;
  background: #000;
}
.yvsl-player-host { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; }
.yvsl-player-host > div, .yvsl-player-host iframe, .yvsl-stage > iframe { width: 100% !important; height: 100% !important; display: block; border: 0; pointer-events: none !important; }
.yvsl-loop-mirror { position: absolute; inset: 0; z-index: 0; overflow: hidden; opacity: 0; pointer-events: none; }
.yvsl-loop-mirror--visible { opacity: 1; }
.yvsl-loop-mirror .yvsl-player-host, .yvsl-loop-mirror iframe { width: 100% !important; height: 100% !important; display: block; border: 0; pointer-events: none !important; }
.yvsl-root--clean-youtube .yvsl-stage > iframe.yvsl-player-host,
.yvsl-root--clean-youtube .yvsl-loop-mirror > iframe.yvsl-player-host { top: -1000px !important; bottom: auto !important; height: calc(100% + 2000px) !important; }
.yvsl-stage-interaction { position: absolute; inset: 0; z-index: 1; }
.yvsl-stage-interaction[role="button"] { cursor: pointer; }
.yvsl-stage-interaction:focus-visible { outline: 3px solid color-mix(in srgb, var(--yvsl-accent) 70%, white); outline-offset: -5px; }
.yvsl-poster { position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; overflow: hidden; background: #000; pointer-events: none; }
.yvsl-poster[hidden] { display: none; }
.yvsl-poster__image { width: 100%; height: 100%; object-fit: cover; opacity: .78; }
.yvsl-poster__play { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: clamp(58px, 11%, 92px); aspect-ratio: 1; padding-left: .08em; color: #171400; background: var(--yvsl-accent); border-radius: 50%; box-shadow: 0 18px 45px rgba(0,0,0,.38); font-size: clamp(24px, 4vw, 38px); transform: translate(-50%, -50%); }
.yvsl-stage-overlay { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.yvsl-zone--corner { position: absolute; display: grid; gap: 8px; width: max-content; max-width: min(46%, 380px); pointer-events: none; }
.yvsl-zone--corner:empty { display: none; }
.yvsl-zone--corner .yvsl-cta, .yvsl-zone--corner .yvsl-hook { width: max-content; max-width: 100%; pointer-events: auto; box-shadow: 0 8px 30px rgba(0,0,0,.34); }
.yvsl-zone--top-left { top: 14px; left: 14px; justify-items: start; }
.yvsl-zone--top-right { top: 14px; right: 14px; justify-items: end; }
.yvsl-zone--bottom-left { bottom: 14px; left: 14px; justify-items: start; }
.yvsl-zone--bottom-right { right: 14px; bottom: 14px; justify-items: end; }
.yvsl-zone { display: grid; gap: 8px; }
.yvsl-zone:empty { display: none; }
.yvsl-zone--above { padding: 12px 14px 0; }
.yvsl-zone--below { padding: 0 14px 12px; }
.yvsl-root .yvsl-hook {
  margin: 0;
  padding: 10px 12px;
  color: #fff;
  background: rgba(8, 10, 12, .92);
  border: 1px solid rgba(255,255,255,.2);
  border-left: 4px solid var(--yvsl-accent);
  border-radius: 8px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,.72);
  backdrop-filter: blur(8px);
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
.yvsl-btn[hidden] { display: none; }
.yvsl-btn:hover { background: rgba(255, 255, 255, .08); }
.yvsl-play.yvsl-is-loading, .yvsl-poster__play.yvsl-is-loading { color: transparent; font-size: 0; padding: 0; }
.yvsl-play.yvsl-is-loading::after, .yvsl-poster__play.yvsl-is-loading::after {
  content: "";
  display: block;
  flex: none;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,.36);
  border-top-color: var(--yvsl-accent);
  border-right-color: var(--yvsl-accent);
  border-radius: 50%;
  animation: yvsl-spin .72s linear infinite;
  transform-origin: center;
  will-change: transform;
}
.yvsl-poster__play.yvsl-is-loading::after { position: absolute; top: 50%; left: 50%; width: clamp(26px, 4vw, 36px); height: clamp(26px, 4vw, 36px); border-width: 4px; border-color: rgba(23,20,0,.25); border-top-color: #171400; border-right-color: #171400; animation-name: yvsl-spin-centered; }
@keyframes yvsl-spin { to { transform: rotate(360deg); } }
@keyframes yvsl-spin-centered { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .yvsl-is-loading::after { animation-duration: 1.6s; } }
.yvsl-btn:focus-visible, .yvsl-progress:focus-visible, .yvsl-cta:focus-visible, .yvsl-speed:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--yvsl-accent) 70%, white);
  outline-offset: 2px;
}
.yvsl-btn--accent { color: #111; background: var(--yvsl-accent); border-color: var(--yvsl-accent); font-weight: 800; }
.yvsl-controls {
  display: grid;
  grid-template-columns: auto auto auto minmax(90px, 1fr) auto auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--yvsl-panel);
}
.yvsl-controls[hidden] { display: none; }
.yvsl-captions { font-size: 12px; font-weight: 900; letter-spacing: -.03em; }
.yvsl-captions[aria-pressed="true"] { color: #111; background: var(--yvsl-accent); border-color: var(--yvsl-accent); }
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
.yvsl-sticky-close { display: none; position: absolute; top: 8px; right: 8px; z-index: 6; width: 44px; height: 44px; min-width: 44px; min-height: 44px; padding: 0; background: rgba(0,0,0,.78); border-radius: 50%; box-shadow: 0 4px 18px rgba(0,0,0,.4); font-size: 22px; }
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
.yvsl-root--popup-idle { position: fixed !important; top: 0 !important; left: -100000px !important; width: min(960px, 100vw) !important; opacity: 0; pointer-events: none; }
.yvsl-popup-panel { width: min(960px, 100%); max-height: calc(100vh - 44px); overflow: auto; }
.yvsl-popup-close { position: fixed; top: 14px; right: 14px; z-index: 1; background: #111; }
.yvsl-root:fullscreen { position: relative; width: 100vw; height: 100vh; height: 100dvh; border-radius: 0; background: #000; box-shadow: none; }
.yvsl-root:fullscreen .yvsl-stage { width: 100%; height: 100%; max-height: none; aspect-ratio: auto; }
.yvsl-root:fullscreen .yvsl-controls {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  padding-top: 28px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: linear-gradient(transparent, rgba(0, 0, 0, .88) 44%);
  transition: opacity .22s ease, transform .22s ease;
}
.yvsl-root:fullscreen.yvsl-controls-hidden .yvsl-controls { opacity: 0; transform: translateY(105%); pointer-events: none; }
.yvsl-visually-hidden { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
@media (max-width: 520px) {
  .yvsl-controls { grid-template-columns: auto auto auto minmax(60px, 1fr) auto auto; padding: 8px; gap: 5px; }
  .yvsl-time { display: none; }
  .yvsl-btn { min-width: 38px; padding: 7px 9px; }
  .yvsl-root--sticky { right: 8px; bottom: 8px; width: calc(100vw - 16px); }
  .yvsl-zone--corner { max-width: calc(100% - 20px); }
  .yvsl-zone--top-left { top: 10px; left: 10px; }
  .yvsl-zone--top-right { top: 10px; right: 10px; }
  .yvsl-zone--bottom-left { bottom: 10px; left: 10px; }
  .yvsl-zone--bottom-right { right: 10px; bottom: 10px; }
  .yvsl-popup-backdrop { padding: 0; background: #000; }
  .yvsl-popup-panel { width: 100%; max-height: 100vh; max-height: 100dvh; overflow: hidden; }
  .yvsl-popup-panel .yvsl-root { border-radius: 0; box-shadow: none; }
  .yvsl-popup-close { top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); }
}
@media (prefers-reduced-motion: reduce) {
  .yvsl-root *, .yvsl-root *::before, .yvsl-root *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  .yvsl-root .yvsl-play.yvsl-is-loading::after { animation: yvsl-spin 1.6s linear infinite !important; }
  .yvsl-root .yvsl-poster__play.yvsl-is-loading::after { animation: yvsl-spin-centered 1.6s linear infinite !important; }
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

  // src/player.js
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
      if (this.options.popup?.trigger) document.querySelectorAll(this.options.popup.trigger);
      this.progressSession = new PlayerProgress({ mount: this.mount, options: this.options, videoId: this.videoId, storage: dependencies.storage });
      this.timers = new TimerRegistry(window);
      this.modal = new ModalController(this);
      this.destroyed = false;
      this.failed = false;
      this.playbackIntent = "idle";
      this.initialPlaybackHandled = false;
      this.adapter = null;
      this.stickyController = new StickyController(this);
      this.captions = new CaptionController(this);
      this.loop = new LoopController(this);
      this.playerState = YT_STATE.UNSTARTED;
      this.tickTimer = null;
      this.saveAt = 0;
      this.progressEventAt = 0;
      this.seekGeneration = 0;
      this.stageRevealed = false;
      this.stageWarmupTimer = null;
      this.stageWarmupWasMuted = null;
      this.stageWarmupBypassNextPlay = false;
      this.stageWasRevealedBeforeBuffering = false;
      this.playbackProbeTimer = null;
      this.clockConfirmedPlaying = false;
      this.mutedIntent = null;
      this.fullscreenControlsTimer = null;
      this.adapterMountPromise = null;
      this.pendingPlay = false;
      this.loading = false;
      this.completed = false;
      this.hasStarted = false;
      this.lastActiveAt = 0;
      this.readyState = false;
      this.timedNodes = [];
      this.cleanup = [];
      this.managedRevealElements = /* @__PURE__ */ new Map();
      this.popupOpen = false;
      this.originalNodes = Array.from(this.mount.childNodes);
      installStyles(document, this.options.styleNonce);
      this._render();
      this._applyTheme();
      this.storage = this.progressSession.storage;
      this.saved = this.storage.load();
      this.unlocks = new Set(this.saved.unlocks);
      this.timeline = new PlaybackTimeline({
        ...this.options.playback,
        maxWatched: this.saved.maxWatched
      });
      this._renderTimedItems();
      this._setupPopup();
      this.stickyController.setup();
      this._bindLifecycle();
      instances.add(this);
      const preloadPopup = typeof this.options.popup === "object" && this.options.popup.preload === true;
      this.ready = this.options.popup && !preloadPopup ? Promise.resolve(this) : this._ensureAdapterMounted();
      this.ready.catch(() => {
      });
    }
    _ensureAdapterMounted() {
      if (this.destroyed || this.failed) return Promise.resolve(this);
      if (this.adapterMountPromise) return this.adapterMountPromise;
      this.adapterMountPromise = this._mountAdapter();
      return this.adapterMountPromise;
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
        if (this.options.playback.end != null) {
          const loopSafetyGap = this.options.playback.loop ? Math.max(2, this.options.playback.rate) : 0;
          playerVars.end = Math.ceil(this.options.playback.end + loopSafetyGap);
        }
        if (this.options.captions.enabled === true) playerVars.cc_load_policy = 1;
        if (this.options.captions.language) playerVars.cc_lang_pref = this.options.captions.language;
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
            apiChange: () => this.captions.onApiChange(),
            autoplayBlocked: () => this._onAutoplayBlocked(),
            error: (code) => this._onPlayerError(code)
          }
        });
        await this.adapter.mount();
        if (this.destroyed || this.failed) return this;
        if (this.options.playback.loop) {
          this.loop.mirror = adapterFactory({
            element: this.dom.loopMirrorHost,
            videoId: this.videoId,
            playerVars,
            events: {
              stateChange: (state) => {
                this.loop.mirrorState = state;
              },
              error: () => {
                this.loop.ready = false;
                this.loop.preparing = false;
              }
            }
          });
          try {
            await this.loop.mirror.mount();
          } catch {
            this.loop.mirror.destroy();
            this.loop.mirror = null;
            return this;
          }
          if (this.destroyed || this.failed) {
            this.loop.mirror.destroy();
            return this;
          }
          this.loop.mirror.mute();
          this.loop.mirror.setPlaybackRate(this.options.playback.rate);
          if (this.playerState === YT_STATE.PLAYING) this.loop.prepare();
        }
        return this;
      } catch (error) {
        if (this.destroyed) return this;
        if (!this.failed) this._showError(error?.message || this.options.locale.genericError, error?.code || "api");
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
      const loopMirror = element("div", "yvsl-loop-mirror", { "aria-hidden": "true" });
      const loopMirrorHost = element("div", "yvsl-player-host", { id: `${this.id}-loop-mirror` });
      loopMirror.append(loopMirrorHost);
      const stageInteraction = element("div", "yvsl-stage-interaction", {
        role: this.options.stage.clickToToggle ? "button" : null,
        tabindex: this.options.stage.clickToToggle ? "0" : null,
        "aria-label": this.options.stage.clickToToggle ? locale.play : null
      });
      const poster = element("div", "yvsl-poster", { hidden: this.options.stage.poster === false });
      const posterImage = element("img", "yvsl-poster__image", {
        src: this._posterUrl(),
        alt: "",
        draggable: "false"
      });
      const posterPlay = element("span", "yvsl-poster__play", { text: "\u25B6", "aria-hidden": "true" });
      poster.append(posterImage, posterPlay);
      const stageOverlay = element("div", "yvsl-stage-overlay");
      const topLeft = element("div", "yvsl-zone yvsl-zone--corner yvsl-zone--top-left");
      const topRight = element("div", "yvsl-zone yvsl-zone--corner yvsl-zone--top-right");
      const bottomLeft = element("div", "yvsl-zone yvsl-zone--corner yvsl-zone--bottom-left");
      const bottomRight = element("div", "yvsl-zone yvsl-zone--corner yvsl-zone--bottom-right");
      stageOverlay.append(topLeft, topRight, bottomLeft, bottomRight);
      stage.append(playerHost, loopMirror, stageInteraction, poster, stageOverlay);
      const error = element("div", "yvsl-error", { hidden: true, role: "alert" });
      const controls = element("div", "yvsl-controls");
      const play = this._button("\u25B6", locale.play, "yvsl-play");
      const volume = this._button("\u{1F507}", locale.unmute, "yvsl-volume");
      const captions = this._button("CC", locale.captionsEnable, "yvsl-captions");
      captions.hidden = true;
      captions.setAttribute("aria-pressed", "false");
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
      controls.append(play, volume, captions, progress, time, speed, fullscreen);
      const below = element("div", "yvsl-zone yvsl-zone--below");
      root.append(stickyClose, above, message, stage, error, controls, below);
      this.mount.replaceChildren(sentinel, root);
      this.dom = { root, sentinel, above, message, stage, playerHost, loopMirror, loopMirrorHost, stageInteraction, poster, posterImage, posterPlay, stageOverlay, topLeft, topRight, bottomLeft, bottomRight, error, controls, play, volume, captions, progress, time, speed, fullscreen, stickyClose, below };
      this.captions.updateUiMode();
      this._listen(play, "click", () => this.playerState === YT_STATE.PLAYING ? this.pause() : this.play());
      this._listen(volume, "click", () => this._isMuted() ? this.unmute() : this.mute());
      this._listen(captions, "click", () => this.captions.toggle());
      this._listen(progress, "input", () => this._seekFromProgress());
      this._listen(speed, "change", () => this._setRate(Number(speed.value)));
      this._listen(fullscreen, "click", () => this._toggleFullscreen());
      this._listen(stickyClose, "click", () => this.stickyController.dismiss());
      this._listen(document, "fullscreenchange", () => this._updateFullscreenButton());
      this._listen(root, "pointermove", () => {
        if (document.fullscreenElement === root) this._revealFullscreenControls();
      });
      if (this.options.stage.clickToToggle) {
        this._listen(stageInteraction, "click", () => this._handleStageInteraction());
        this._listen(stageInteraction, "keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          this._handleStageInteraction();
        });
      }
      if (this.options.stage.poster === "auto") {
        this._listen(posterImage, "error", () => {
          posterImage.src = `https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg`;
        }, { once: true });
      }
    }
    _posterUrl() {
      if (this.options.stage.poster === false) return null;
      if (this.options.stage.poster === "auto") return `https://i.ytimg.com/vi/${this.videoId}/maxresdefault.jpg`;
      return toSafeUrl(this.options.stage.poster, location.href);
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
      if (this.destroyed || this.failed || this.readyState) return;
      this.readyState = true;
      if (this.mutedIntent == null) this.mutedIntent = this.adapter?.isMuted?.() ?? false;
      else this._syncMutedIntent();
      this._refreshDuration();
      this._populateRates();
      this._setRate(this.options.playback.rate);
      this.captions.startProbe();
      this._updateUi();
      this._emit("ready");
      this._emit("view");
      this._applyInitialPlayback();
    }
    _applyInitialPlayback() {
      if (this.initialPlaybackHandled || this.destroyed || this.failed || !this.readyState || this.options.popup && !this.popupOpen) return;
      this.initialPlaybackHandled = true;
      if (this.playbackIntent === "paused") return;
      const canResume = this.saved.position > 3 && this.saved.position < Math.max(0, this.timeline.duration - 2);
      if (canResume && this.options.playback.resume === "ask") {
        this._showResumePrompt();
      } else if (canResume && this.options.playback.resume === "auto") {
        this.seek(this.saved.position);
        if (this.options.playback.autoplay === "smart") this._startSmartAutoplay();
      } else if (this.options.playback.autoplay === "smart") {
        this._startSmartAutoplay();
      }
    }
    _refreshDuration() {
      const sourceDuration = this.adapter?.getDuration?.() || 0;
      if (sourceDuration > 0) {
        if (this.timeline.start >= sourceDuration) {
          const error = new RangeError("\u041D\u0430\u0447\u0430\u043B\u043E \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u043C\u0438 \u0432\u0438\u0434\u0435\u043E");
          error.code = "config";
          throw error;
        }
        this.timeline.setDuration(sourceDuration);
      }
      return this.timeline.duration;
    }
    _startSmartAutoplay() {
      if (this.destroyed || this.failed || this.playbackIntent === "paused" || this.options.popup && !this.popupOpen) return;
      this.mute();
      this.play();
      this._showUnmutePrompt();
      this.timers.timeout(() => {
        if (!this.destroyed && !this.failed && this.playbackIntent === "playing" && this.playerState !== YT_STATE.PLAYING && (!this.options.popup || this.popupOpen)) this._showAutoplayFallback();
      }, 1800);
    }
    _showUnmutePrompt() {
      const label = this.options.locale.unmutePrompt || this.options.locale.unmute;
      const button = this._button("\u{1F50A}", label, "yvsl-btn--accent");
      button.textContent = label;
      this._listen(button, "click", () => {
        this.unmute(true);
        this.play();
      });
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
    _onAutoplayBlocked() {
      if (this.destroyed || this.failed || this.playbackIntent !== "playing" || this.options.popup && !this.popupOpen) return;
      this._stopPlaybackProbe();
      this.loading = false;
      this._updateUi();
      this._showAutoplayFallback();
    }
    _showResumePrompt() {
      const continueButton = this._button("\u25B6", this.options.locale.continue, "yvsl-btn--accent");
      continueButton.textContent = this.options.locale.continue;
      const restartButton = this._button("\u21BA", this.options.locale.restart);
      restartButton.textContent = this.options.locale.restart;
      this._listen(continueButton, "click", () => {
        this.seek(this.saved.position);
        this.unmute();
        this.play();
        this._emit("resume", { action: "continue", position: this.saved.position });
      });
      this._listen(restartButton, "click", () => {
        this.seek(0);
        this.unmute();
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
      if (this.destroyed || this.failed) return;
      if (state === YT_STATE.PAUSED && this.playerState === YT_STATE.PAUSED) return;
      if (state === YT_STATE.PLAYING && (this.playbackIntent === "paused" || this.options.popup && !this.popupOpen)) {
        this.adapter?.pause();
        return;
      }
      const previousState = this.playerState;
      const confirmedByClock = this.clockConfirmedPlaying;
      this.playerState = state;
      if (state === YT_STATE.BUFFERING || state === YT_STATE.PLAYING) {
        this.captions.startProbe();
        this.captions.syncIntent();
      }
      this.loading = state === YT_STATE.BUFFERING;
      if (state === YT_STATE.BUFFERING) {
        this.clockConfirmedPlaying = false;
        this.stageWasRevealedBeforeBuffering = this.stageRevealed;
        this._stopTicker();
        this.timeline.resetClock();
        this._startPlaybackProbe(previousState !== YT_STATE.PLAYING);
        this.stickyController.apply();
        this._revealFullscreenControls(false);
        this._updateUi();
        return;
      }
      this._stopPlaybackProbe();
      if (this.loop.restarting && state !== YT_STATE.PLAYING) {
        this.clockConfirmedPlaying = false;
        this.stageRevealed = true;
        this.stageWasRevealedBeforeBuffering = false;
        this._cancelStageWarmup();
        this._stopTicker();
        this.timeline.resetClock();
        this.stickyController.apply();
        this._updateUi();
        return;
      }
      if (state === YT_STATE.PLAYING && confirmedByClock && previousState === YT_STATE.PLAYING) {
        this.clockConfirmedPlaying = false;
        this.loading = false;
        this.stageRevealed = true;
        this.stageWasRevealedBeforeBuffering = false;
        this._startTicker();
        this.stickyController.apply();
        this._updateUi();
        this._scheduleFullscreenControlsHide();
        return;
      }
      this.clockConfirmedPlaying = false;
      if (state === YT_STATE.PLAYING) {
        this.hasStarted = true;
        if (this.stageWarmupBypassNextPlay) {
          this.stageWarmupBypassNextPlay = false;
          this.stageRevealed = true;
        } else if (this.stageWasRevealedBeforeBuffering) {
          this.stageRevealed = true;
        } else {
          this._startStageWarmup();
        }
        this.stageWasRevealedBeforeBuffering = false;
        this.lastActiveAt = Date.now();
        this.completed = false;
        if (this.options.playback.singlePlayback) {
          for (const instance of instances) {
            if (instance !== this && (instance.playbackIntent === "playing" || instance.playerState === YT_STATE.PLAYING)) instance.pause();
          }
        }
        this._startTicker();
        this.loop.prepare();
        this._emit("play");
      } else {
        this.stageWarmupBypassNextPlay = false;
        this.stageWasRevealedBeforeBuffering = false;
        this._cancelStageWarmup();
        this.stageRevealed = false;
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
      this.stickyController.apply();
      this._updateUi();
      if (state === YT_STATE.PLAYING) this._scheduleFullscreenControlsHide();
      else this._revealFullscreenControls(false);
    }
    _handleStageInteraction() {
      const fullscreen = document.fullscreenElement === this.dom.root;
      if (fullscreen) {
        this._revealFullscreenControls();
        return;
      }
      this.playerState === YT_STATE.PLAYING ? this.pause() : this.play();
    }
    _onRateChange(rate) {
      this.timeline.rate = Number(rate) || 1;
      if (this.dom.speed) this.dom.speed.value = String(this.timeline.rate);
    }
    _onPlayerError(code) {
      if (this.destroyed || this.failed) return;
      const locale = this.options.locale;
      let message = locale.genericError;
      if ([101, 150].includes(Number(code))) message = locale.embedError;
      if (Number(code) === 100) message = locale.unavailableError;
      if (Number(code) === 153) message = locale.identityError;
      this._showError(message, code);
    }
    _showError(message, code) {
      if (this.destroyed || this.failed) return;
      this.failed = true;
      this.readyState = false;
      this.playbackIntent = "paused";
      this.pendingPlay = false;
      this._stopTicker();
      this._stopPlaybackProbe();
      this.captions.stopProbe();
      this.captions.stopApply();
      this.loop.cancel();
      this._cancelStageWarmup();
      this.timers.clearAll();
      this.adapter?.pause();
      this.loop.mirror?.pause?.();
      this.playerState = YT_STATE.PAUSED;
      this.stageRevealed = false;
      this.loading = false;
      this.loop.restarting = false;
      this._updateUi();
      this.dom.error.textContent = message;
      this.dom.error.hidden = false;
      this.dom.controls.hidden = true;
      this._hideMessage();
      this._emit("error", { code, message });
    }
    _startTicker() {
      if (this.tickTimer) return;
      const interval = this.options.playback.loop ? 50 : 250;
      this.tickTimer = this.timers.interval(() => this._tick(), interval);
    }
    _stopTicker() {
      if (!this.tickTimer) return;
      this.timers.clear(this.tickTimer);
      this.tickTimer = null;
    }
    _startPlaybackProbe(emitPlay = false) {
      this._stopPlaybackProbe();
      if (!this.adapter || !this.loading) return;
      let lastTime = Number(this.adapter.getCurrentTime?.()) || 0;
      let advancingSamples = 0;
      const probe = () => {
        this.playbackProbeTimer = null;
        if (this.destroyed || !this.adapter || !this.loading) return;
        const currentTime = Number(this.adapter.getCurrentTime?.()) || 0;
        const delta = currentTime - lastTime;
        if (delta > 0.015 && delta < 0.5) advancingSamples += 1;
        else if (delta <= 0.015) advancingSamples = 0;
        else advancingSamples = 0;
        lastTime = currentTime;
        if (advancingSamples >= 2) {
          this._confirmPlaybackFromClock(emitPlay);
          return;
        }
        this.playbackProbeTimer = this.timers.timeout(probe, 80);
      };
      this.playbackProbeTimer = this.timers.timeout(probe, 80);
    }
    _stopPlaybackProbe() {
      if (this.playbackProbeTimer) this.timers.clear(this.playbackProbeTimer);
      this.playbackProbeTimer = null;
    }
    _confirmPlaybackFromClock(emitPlay) {
      this._stopPlaybackProbe();
      this.playerState = YT_STATE.PLAYING;
      this.clockConfirmedPlaying = true;
      this.loading = false;
      this.hasStarted = true;
      this.stageRevealed = true;
      this.stageWasRevealedBeforeBuffering = false;
      this.lastActiveAt = Date.now();
      this.completed = false;
      if (this.options.playback.singlePlayback) {
        for (const instance of instances) {
          if (instance !== this && (instance.playbackIntent === "playing" || instance.playerState === YT_STATE.PLAYING)) instance.pause();
        }
      }
      this._startTicker();
      this.stickyController.apply();
      this._updateUi();
      this._scheduleFullscreenControlsHide();
      if (emitPlay) this._emit("play");
    }
    _tick() {
      if (this.destroyed || this.failed || !this.adapter || !this.readyState) return;
      if (this.stageWarmupTimer) {
        this._updateUi();
        return;
      }
      if (!this.timeline.duration) {
        try {
          this._refreshDuration();
        } catch (error) {
          this._showError(error.message, error.code || "config");
          return;
        }
      }
      const sourceTime = this.adapter.getCurrentTime();
      if (this.loop.restarting && this.timeline.duration && sourceTime - this.timeline.start > this.timeline.duration * 0.75) {
        this._updateUi();
        return;
      }
      const observed = this.timeline.observe(sourceTime, {
        playing: this.playerState === YT_STATE.PLAYING
      });
      if (observed.blocked) {
        this.adapter.seekTo(observed.correctionSourceTime);
        this.timeline.current = this.timeline.maxWatched;
        this.timeline.resetClock();
      }
      const loopSettledAt = Math.min(1, this.timeline.duration * 0.25);
      if (this.loop.restarting && this.playerState === YT_STATE.PLAYING && this.timeline.current >= loopSettledAt) {
        this.loop.restarting = false;
      }
      const endTolerance = this.options.playback.loop ? Math.max(0.08, this.timeline.rate * 0.06) : 0.2;
      if (this.timeline.duration && this.timeline.current >= this.timeline.duration - endTolerance) {
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
      if (this.completed || this.loop.restarting || !this.timeline.duration) return;
      this.completed = true;
      this.timeline.current = this.timeline.duration;
      this.timeline.grant(this.timeline.duration);
      this._updateUi();
      this._updateTimedItems();
      this._emit("complete");
      if (this.options.playback.loop) {
        const wasPlaying = this.playerState === YT_STATE.PLAYING;
        this.completed = false;
        this.loop.restarting = true;
        if (!this.loop.startTransition()) {
          this.adapter.seekTo(this.options.playback.start, true);
        }
        this.timeline.current = 0;
        this.timeline.resetClock();
        if (!this.loop.active) this._syncMutedIntent();
        if (!wasPlaying) this.adapter.play();
      } else {
        this.loop.restarting = false;
        this.adapter.pause();
        this._saveProgress({ position: 0 });
      }
    }
    _updateUi() {
      const playing = this.playerState === YT_STATE.PLAYING;
      const seamlessLoopTransition = this.loop.restarting && this.playerState !== YT_STATE.PLAYING;
      const presentingAsPlaying = playing || seamlessLoopTransition;
      const showLoading = this.loading && !seamlessLoopTransition;
      const displayingVideo = presentingAsPlaying || this.playerState === YT_STATE.BUFFERING && this.stageWasRevealedBeforeBuffering;
      this.dom.play.textContent = presentingAsPlaying ? "\u2161" : "\u25B6";
      this.dom.play.classList.toggle("yvsl-is-loading", showLoading);
      this.dom.posterPlay.classList.toggle("yvsl-is-loading", showLoading);
      this.dom.play.title = showLoading ? this.options.locale.loading : presentingAsPlaying ? this.options.locale.pause : this.options.locale.play;
      this.dom.play.setAttribute("aria-label", this.dom.play.title);
      this.dom.stageInteraction.setAttribute("aria-label", this.dom.play.title);
      this.dom.poster.hidden = this.options.stage.poster === false || displayingVideo && this.stageRevealed;
      const muted = this._isMuted();
      this.dom.volume.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
      this.dom.volume.title = muted ? this.options.locale.unmute : this.options.locale.mute;
      this.dom.volume.setAttribute("aria-label", this.dom.volume.title);
      this.captions.updateButton();
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
      this.loop.mirror?.setPlaybackRate?.(this.timeline.rate);
    }
    _startStageWarmup() {
      this._cancelStageWarmup();
      const delay = this.options.stage.poster === false ? 0 : this.options.stage.revealDelay;
      if (!delay) {
        this.stageRevealed = true;
        return;
      }
      const returnPosition = this.timeline.current;
      this.stageRevealed = false;
      this.stageWarmupWasMuted = this._isMuted();
      if (!this.stageWarmupWasMuted) this.adapter?.mute?.();
      this.loading = true;
      this._updateUi();
      this.stageWarmupTimer = this.timers.timeout(() => {
        this.stageWarmupTimer = null;
        if (this.destroyed || this.playerState !== YT_STATE.PLAYING) return;
        this.stageWarmupBypassNextPlay = true;
        this.adapter?.seekTo?.(this.timeline.start + returnPosition);
        this.timeline.current = returnPosition;
        this.timeline.resetClock();
        this._syncMutedIntent();
        this.stageWarmupWasMuted = null;
        this.stageRevealed = true;
        this.loading = false;
        this._updateUi();
      }, delay);
    }
    _cancelStageWarmup() {
      if (this.stageWarmupTimer) this.timers.clear(this.stageWarmupTimer);
      this.stageWarmupTimer = null;
      if (this.stageWarmupWasMuted != null) this._syncMutedIntent();
      this.stageWarmupWasMuted = null;
      this.loading = false;
      if (this.dom) this._updateUi();
    }
    _renderTimedItems() {
      for (const item of this.options.reveals) {
        this.timedNodes.push({ type: "reveal", item, node: null, shown: false });
        this._prepareReveal(item);
      }
      for (const item of this.options.hooks) {
        const node = element("p", "yvsl-hook", { text: String(item.text || ""), hidden: true });
        this._zone(item.placement).append(node);
        this.timedNodes.push({ type: "hook", item, node, shown: false });
      }
      for (const item of this.options.ctas) {
        const safeUrl = toSafeUrl(item.url, location.href);
        const node = safeUrl ? element("a", "yvsl-cta", { text: String(item.text || "\u041F\u0435\u0440\u0435\u0439\u0442\u0438"), href: safeUrl, target: item.target || "_self" }) : element("button", "yvsl-cta", { text: String(item.text || "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435"), type: "button" });
        this._applyCtaColors(node, item);
        node.hidden = true;
        if (node.target === "_blank") node.rel = "noopener noreferrer";
        this._zone(item.placement).append(node);
        this.timedNodes.push({ type: "cta", item, node, shown: false });
        this._prepareReveal(item);
        this._listen(node, "click", () => {
          this._reveal(item, true, item.scroll !== false);
          this._emit("cta-click", { cta: item.id, url: safeUrl });
        });
      }
      this._updateTimedItems();
    }
    _applyCtaColors(node, item) {
      const supportsColor = (value) => typeof value === "string" && (!globalThis.CSS?.supports || globalThis.CSS.supports("color", value));
      if (supportsColor(item.background)) node.style.backgroundColor = item.background;
      if (supportsColor(item.color)) node.style.color = item.color;
    }
    _zone(placement) {
      return {
        above: this.dom.above,
        below: this.dom.below,
        "top-left": this.dom.topLeft,
        "top-right": this.dom.topRight,
        "bottom-left": this.dom.bottomLeft,
        "bottom-right": this.dom.bottomRight
      }[placement] || this.dom.below;
    }
    _prepareReveal(item) {
      const selector = this._revealSelector(item);
      if (!selector) return;
      let nodes = [];
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        return;
      }
      for (const node of nodes) {
        if (!this.managedRevealElements.has(node)) this.managedRevealElements.set(node, { hidden: node.hidden, ariaHidden: node.getAttribute("aria-hidden") });
        if (!this.unlocks.has(unlockKey(item))) {
          node.hidden = true;
          node.setAttribute("aria-hidden", "true");
        }
      }
      if (this.unlocks.has(unlockKey(item))) this._reveal(item, false);
    }
    _revealSelector(item) {
      return item.selector || item.reveal || "";
    }
    _hideReveal(item) {
      const selector = this._revealSelector(item);
      if (!selector) return;
      try {
        for (const node of document.querySelectorAll(selector)) {
          node.hidden = true;
          node.setAttribute("aria-hidden", "true");
        }
      } catch {
      }
    }
    _reveal(item, persist = true, scroll = false) {
      const selector = this._revealSelector(item);
      let firstNode = null;
      if (selector) {
        try {
          for (const node of document.querySelectorAll(selector)) {
            if (!firstNode) firstNode = node;
            node.hidden = false;
            node.removeAttribute("aria-hidden");
          }
        } catch {
        }
      }
      if (scroll && firstNode) firstNode.scrollIntoView({ behavior: "smooth", block: "start" });
      if (item.persist !== false && persist && !this.unlocks.has(unlockKey(item))) {
        this.unlocks.add(unlockKey(item));
        this._saveProgress();
      }
    }
    _updateTimedItems() {
      const current = this.timeline?.current || 0;
      for (const entry of this.timedNodes) {
        const { item, node, type } = entry;
        const unlocked = type !== "hook" && item.persist !== false && this.unlocks.has(unlockKey(item));
        const active = unlocked || current >= item.start && current <= item.end;
        if (node) node.hidden = !active;
        if (active && !entry.shown) {
          entry.shown = true;
          if (type === "reveal") {
            this._reveal(item, true, item.scroll === true);
          } else if (type === "cta") {
            this._emit("cta-show", { cta: item.id });
            if (item.autoScroll) node.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } else if (!active) {
          entry.shown = false;
          if (type !== "hook" && item.persist === false) this._hideReveal(item);
        }
      }
    }
    _setupPopup() {
      const popup = this.options.popup;
      if (!popup) return;
      this._createPopup();
      this.dom.popupPanel.append(this.dom.root);
      this.dom.root.classList.add("yvsl-root--popup-idle");
      this.dom.root.setAttribute("aria-hidden", "true");
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
      this._listen(document, "keydown", (event) => this.modal.handleKey(event));
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
      this.stickyController.apply();
      if (active) this._revealFullscreenControls();
      else {
        this._clearFullscreenControlsTimer();
        this.dom.root.classList.remove("yvsl-controls-hidden");
      }
      this.dom.fullscreen.textContent = active ? "\xD7" : "\u26F6";
      this.dom.fullscreen.title = active ? this.options.locale.exitFullscreen : this.options.locale.fullscreen;
      this.dom.fullscreen.setAttribute("aria-label", this.dom.fullscreen.title);
    }
    _clearFullscreenControlsTimer() {
      if (!this.fullscreenControlsTimer) return;
      this.timers.clear(this.fullscreenControlsTimer);
      this.fullscreenControlsTimer = null;
    }
    _revealFullscreenControls(scheduleHide = true) {
      this._clearFullscreenControlsTimer();
      this.dom.root.classList.remove("yvsl-controls-hidden");
      if (scheduleHide) this._scheduleFullscreenControlsHide();
    }
    _scheduleFullscreenControlsHide() {
      this._clearFullscreenControlsTimer();
      if (document.fullscreenElement !== this.dom.root || this.playerState !== YT_STATE.PLAYING) return;
      this.fullscreenControlsTimer = this.timers.timeout(() => {
        this.fullscreenControlsTimer = null;
        if (document.fullscreenElement === this.dom.root && this.playerState === YT_STATE.PLAYING) {
          this.dom.root.classList.add("yvsl-controls-hidden");
        }
      }, 2400);
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
      this.progressSession.save(this, overrides);
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
      if (this.destroyed || this.failed) return this;
      this.playbackIntent = "playing";
      if (this.completed) {
        this.completed = false;
        this.seek(0);
      }
      this._hideMessage();
      this.loading = this.playerState !== YT_STATE.PLAYING;
      this._updateUi();
      if (this.options.popup && !this.popupOpen) this.open();
      if (!this.readyState) {
        this.pendingPlay = true;
        this.ready = this._ensureAdapterMounted();
        this.ready.then(() => {
          if (!this.destroyed && this.pendingPlay) {
            this.pendingPlay = false;
            this._syncMutedIntent();
            this.adapter?.play();
            if (this.loading) this._startPlaybackProbe(true);
          }
        }).catch(() => {
          this.pendingPlay = false;
        });
        return this;
      }
      this.pendingPlay = false;
      this._syncMutedIntent();
      this.adapter.play();
      if (this.loading) this._startPlaybackProbe(this.playerState !== YT_STATE.PLAYING);
      return this;
    }
    pause() {
      if (this.destroyed) return this;
      this.playbackIntent = "paused";
      this.pendingPlay = false;
      this._stopPlaybackProbe();
      this.loading = false;
      this.loop.restarting = false;
      this.loop.cancel();
      this._onStateChange(YT_STATE.PAUSED);
      this._updateUi();
      this.adapter?.pause();
      return this;
    }
    enableCaptions(language = null) {
      return this.captions.enable(language);
    }
    disableCaptions() {
      return this.captions.disable();
    }
    toggleCaptions() {
      return this.captions.toggle();
    }
    mute() {
      if (this.destroyed || this.failed) return this;
      this.mutedIntent = true;
      this.adapter?.mute();
      this.loop.mirror?.mute?.();
      this._updateUi();
      return this;
    }
    unmute(restart = false) {
      if (this.destroyed || this.failed) return this;
      if (restart) this.seek(0);
      this.mutedIntent = false;
      this._syncMutedIntent();
      this._hideMessage();
      this._updateUi();
      return this;
    }
    _isMuted() {
      return this.mutedIntent ?? (this.adapter?.isMuted?.() ?? true);
    }
    _syncMutedIntent() {
      if (!this.adapter || this.mutedIntent == null) return;
      const mirrorVisible = this.loop.active && this.dom.loopMirror.classList.contains("yvsl-loop-mirror--visible");
      if (this.mutedIntent || mirrorVisible) this.adapter.mute();
      else this.adapter.unmute();
      if (!this.mutedIntent && mirrorVisible) this.loop.mirror?.unmute?.();
      else this.loop.mirror?.mute?.();
    }
    seek(seconds) {
      if (this.destroyed || this.failed) return this.timeline.current;
      const requested = clamp(seconds, 0, this.timeline.duration || Infinity);
      if (this.options.playback.noSeek === "forward" && requested > this.timeline.maxWatched + 1e-3) {
        this._updateUi();
        return this.timeline.current;
      }
      const sourceTime = this.timeline.seek(requested);
      this.loop.cancel();
      this.loop.restarting = false;
      const logicalTime = sourceTime - this.timeline.start;
      if (logicalTime < this.timeline.duration) this.completed = false;
      const generation = ++this.seekGeneration;
      this.adapter?.seekTo(sourceTime);
      this.timeline.current = logicalTime;
      this._updateUi();
      this._updateTimedItems();
      for (const delay of [100, 400, 900]) {
        this.timers.timeout(() => {
          if (!this.destroyed && generation === this.seekGeneration) this._tick();
        }, delay);
      }
      return logicalTime;
    }
    open() {
      if (this.destroyed || this.failed || this.popupOpen) return this;
      this._createPopup();
      for (const instance of instances) {
        if (instance !== this && (instance.playbackIntent === "playing" || instance.playerState === YT_STATE.PLAYING)) instance.pause();
      }
      this.popupOpen = true;
      this.dom.root.classList.remove("yvsl-root--sticky");
      this.dom.root.classList.remove("yvsl-root--popup-idle");
      this.dom.root.removeAttribute("aria-hidden");
      this.dom.popupBackdrop.hidden = false;
      this.modal.acquire();
      this.dom.popupClose.focus();
      this.ready = this._ensureAdapterMounted();
      this.ready.catch(() => {
      });
      this._applyInitialPlayback();
      return this;
    }
    close() {
      if (this.destroyed || !this.popupOpen) return this;
      this.pendingPlay = false;
      this.pause();
      this.popupOpen = false;
      this.dom.popupBackdrop.hidden = true;
      this.modal.release();
      if (this.options.popup) {
        this.dom.root.classList.add("yvsl-root--popup-idle");
        this.dom.root.setAttribute("aria-hidden", "true");
      }
      this.stickyController.apply();
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
        muted: this._isMuted(),
        captions: this.captions.enabled,
        captionLanguage: this.captions.language,
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
      this._stopPlaybackProbe();
      this.captions.stopProbe();
      this.captions.stopApply();
      this._clearFullscreenControlsTimer();
      this._cancelStageWarmup();
      this.stickyController.observer?.disconnect();
      this.adapter?.destroy();
      this.loop.mirror?.destroy?.();
      for (const dispose of this.cleanup.splice(0)) dispose();
      for (const [node, original] of this.managedRevealElements) {
        node.hidden = original.hidden;
        if (original.ariaHidden == null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", original.ariaHidden);
      }
      this.dom.popupBackdrop?.remove();
      this.modal.release();
      this.timers.dispose();
      this.progressSession.release();
      this.mount.replaceChildren(...this.originalNodes);
      instances.delete(this);
    }
  };

  // package.json
  var package_default = {
    name: "yellow-vsl",
    version: "1.8.2",
    description: "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 VSL-\u043F\u043B\u0435\u0435\u0440 \u0434\u043B\u044F YouTube \u043D\u0430 \u0447\u0438\u0441\u0442\u043E\u043C JavaScript",
    type: "module",
    license: "MIT",
    author: "Yellow Web",
    homepage: "https://github.com/dvygolov/yellow-vsl#readme",
    repository: {
      type: "git",
      url: "git+https://github.com/dvygolov/yellow-vsl.git"
    },
    bugs: {
      url: "https://github.com/dvygolov/yellow-vsl/issues"
    },
    files: [
      "dist",
      "src",
      "types",
      "README.md",
      "LICENSE"
    ],
    main: "dist/yellow-vsl.js",
    module: "dist/yellow-vsl.esm.js",
    types: "types/index.d.ts",
    exports: {
      ".": {
        types: "./types/index.d.ts",
        import: "./dist/yellow-vsl.esm.js",
        default: "./dist/yellow-vsl.js"
      }
    },
    scripts: {
      build: "node scripts/build.mjs",
      "build:site": "npm run build && node scripts/build-site.mjs",
      demo: "node demo/server.mjs",
      test: "npm run build:site && npm run test:unit && npm run test:types && npm run test:browser && npm run test:site",
      "test:types": "tsc --noEmit --strict --module NodeNext --target ES2020 tests/types/api.ts",
      "test:unit": "node --test tests/unit/*.test.mjs",
      "test:browser": "node tests/browser/run.mjs && node tests/browser/regressions.mjs && node tests/browser/loop-inspection.mjs",
      "test:site": "node tests/site/run.mjs",
      "test:live": "node tests/live/run.mjs",
      "test:live:popup": "node tests/live/popup.mjs"
    },
    devDependencies: {
      esbuild: "^0.25.9",
      playwright: "^1.55.0",
      typescript: "^7.0.2"
    },
    engines: {
      node: ">=20.19"
    }
  };

  // src/index.js
  var version = package_default.version;
  var autoInstances = /* @__PURE__ */ new WeakMap();
  function create(target, options = {}) {
    return new YellowVSLPlayer(target, options);
  }
  function autoInit(root = document) {
    const nodes = [];
    if (root instanceof Element && root.matches("[data-yellow-vsl]")) nodes.push(root);
    nodes.push(...root.querySelectorAll("[data-yellow-vsl]"));
    return nodes.map((node) => {
      if (autoInstances.has(node) && !autoInstances.get(node).destroyed) return autoInstances.get(node);
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

  // src/iife.js
  if (typeof window !== "undefined") {
    window.YellowVSL = Object.assign(window.YellowVSL || {}, index_exports);
    const initialize = () => autoInit(document);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
      queueMicrotask(initialize);
    }
  }
})();
//# sourceMappingURL=yellow-vsl.js.map
