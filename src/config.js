import { DEFAULT_PROGRESS_POINTS, clamp, parseAspectRatio, validateProgressPoints } from "./utils.js";

export const DEFAULT_LOCALE = Object.freeze({
  play: "Воспроизвести",
  pause: "Пауза",
  mute: "Выключить звук",
  unmute: "Включить звук",
  unmutePrompt: "Включить звук и начать сначала",
  fullscreen: "На весь экран",
  exitFullscreen: "Выйти из полноэкранного режима",
  progress: "Прогресс просмотра",
  continueTitle: "Вы уже начали смотреть это видео",
  continue: "Продолжить",
  restart: "Начать сначала",
  autoplayBlocked: "Нажмите, чтобы запустить видео",
  loading: "Загрузка видео",
  captionsEnable: "Включить субтитры",
  captionsDisable: "Выключить субтитры",
  close: "Закрыть",
  speed: "Скорость",
  genericError: "Не удалось загрузить видео",
  identityError: "YouTube не получил адрес сайта (HTTP Referer). Откройте страницу через http:// или https://, а не как локальный файл.",
  embedError: "Автор видео запретил воспроизведение на других сайтах",
  unavailableError: "Видео удалено, скрыто или недоступно"
});

export const DEFAULT_OPTIONS = Object.freeze({
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

export function normalizeOptions(options = {}) {
  const playback = { ...DEFAULT_OPTIONS.playback, ...(options.playback || {}) };
  playback.start = Math.max(0, Number(playback.start) || 0);
  playback.end = playback.end == null ? null : Math.max(playback.start, Number(playback.end) || playback.start);
  playback.rate = clamp(playback.rate, 0.25, 2);
  playback.autoplay = playback.autoplay === false ? false : "smart";
  playback.noSeek = playback.noSeek === false ? false : "forward";
  playback.resume = ["ask", "auto", false].includes(playback.resume) ? playback.resume : "ask";

  const progress = { ...DEFAULT_OPTIONS.progress, ...(options.progress || {}) };
  progress.mode = ["smart", "real", "hidden"].includes(progress.mode) ? progress.mode : "smart";
  progress.points = validateProgressPoints(progress.points || DEFAULT_PROGRESS_POINTS);

  const controls = { ...DEFAULT_OPTIONS.controls, ...(options.controls || {}) };
  if (progress.mode === "hidden") controls.progress = false;

  const captions = { ...DEFAULT_OPTIONS.captions, ...(options.captions || {}) };
  captions.enabled = [true, false, "auto"].includes(captions.enabled) ? captions.enabled : "auto";
  captions.language = typeof captions.language === "string" && captions.language.trim()
    ? captions.language.trim().toLowerCase()
    : null;

  const stage = { ...DEFAULT_OPTIONS.stage, ...(options.stage || {}) };
  stage.poster = stage.poster === false ? false : (typeof stage.poster === "string" ? stage.poster : "auto");
  stage.clickToToggle = stage.clickToToggle !== false;
  stage.revealDelay = clamp(stage.revealDelay, 0, 10000);

  return {
    ...DEFAULT_OPTIONS,
    ...options,
    video: options.video,
    playback,
    progress,
    controls,
    captions,
    stage,
    aspectRatio: options.aspectRatio || DEFAULT_OPTIONS.aspectRatio,
    aspectRatioValue: parseAspectRatio(options.aspectRatio || DEFAULT_OPTIONS.aspectRatio),
    ctas: Array.isArray(options.ctas)
      ? options.ctas.map((item, index) => normalizeTimedItem(item, index, "cta"))
      : [],
    hooks: Array.isArray(options.hooks)
      ? options.hooks.map((item, index) => normalizeTimedItem(item, index, "hook"))
      : [],
    reveals: Array.isArray(options.reveals)
      ? options.reveals.map((item, index) => ({
          ...normalizeTimedItem(item, index, "reveal"),
          selector: String(item?.selector || item?.reveal || "")
        }))
      : [],
    theme: { ...(options.theme || {}) },
    locale: { ...DEFAULT_LOCALE, ...(options.locale || {}) }
  };
}

export function optionsFromDataset(element) {
  const dataset = element.dataset;
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
    aspectRatio: dataset.aspectRatio,
    playback,
    progress,
    stage,
    captions,
    sticky: dataset.sticky === "true",
    popup: dataset.popupTrigger ? { trigger: dataset.popupTrigger } : false
  };
}
