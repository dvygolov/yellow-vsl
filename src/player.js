import { normalizeOptions } from "./config.js";
import { ProgressStorage, createStorageKey } from "./storage.js";
import { installStyles } from "./styles.js";
import { PlaybackTimeline } from "./timeline.js";
import {
  clamp,
  formatTime,
  interpolateProgress,
  invertProgress,
  parseYouTubeId,
  toSafeUrl
} from "./utils.js";
import { YouTubeAdapter, YT_STATE } from "./youtube-api.js";

const instances = new Set();
let nextInstanceId = 1;

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

export class YellowVSLPlayer {
  constructor(target, options = {}, dependencies = {}) {
    this.mount = resolveTarget(target);
    if (!this.mount) throw new TypeError("Не найден элемент для размещения YellowVSL");

    this.options = normalizeOptions(options);
    this.videoId = parseYouTubeId(this.options.video);
    if (!this.videoId) throw new TypeError("Укажите корректный URL или ID видео YouTube");

    this.id = `yvsl-${nextInstanceId++}`;
    this.dependencies = dependencies;
    this.destroyed = false;
    this.adapter = null;
    this.playerState = YT_STATE.UNSTARTED;
    this.tickTimer = null;
    this.saveAt = 0;
    this.progressEventAt = 0;
    this.seekGeneration = 0;
    this.stageRevealed = false;
    this.stageWarmupTimer = null;
    this.stageWarmupWasMuted = null;
    this.stageWarmupBypassNextPlay = false;
    this.adapterMountPromise = null;
    this.pendingPlay = false;
    this.completed = false;
    this.lastActiveAt = 0;
    this.readyState = false;
    this.timedNodes = [];
    this.cleanup = [];
    this.managedRevealElements = new Map();
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

    this.ready = this.options.popup ? Promise.resolve(this) : this._ensureAdapterMounted();
  }

  _ensureAdapterMounted() {
    if (this.adapterMountPromise) return this.adapterMountPromise;
    this.adapterMountPromise = this._mountAdapter();
    return this.adapterMountPromise;
  }

  async _mountAdapter() {
    try {
      const origin = location.protocol === "http:" || location.protocol === "https:" ? location.origin : undefined;
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
    const posterPlay = element("span", "yvsl-poster__play", { text: "▶", "aria-hidden": "true" });
    poster.append(posterImage, posterPlay);

    const stageOverlay = element("div", "yvsl-stage-overlay");
    const topLeft = element("div", "yvsl-zone yvsl-zone--corner yvsl-zone--top-left");
    const topRight = element("div", "yvsl-zone yvsl-zone--corner yvsl-zone--top-right");
    const bottomLeft = element("div", "yvsl-zone yvsl-zone--corner yvsl-zone--bottom-left");
    const bottomRight = element("div", "yvsl-zone yvsl-zone--corner yvsl-zone--bottom-right");
    stageOverlay.append(topLeft, topRight, bottomLeft, bottomRight);
    stage.append(playerHost, stageInteraction, poster, stageOverlay);

    const error = element("div", "yvsl-error", { hidden: true, role: "alert" });
    const controls = element("div", "yvsl-controls");
    const play = this._button("▶", locale.play, "yvsl-play");
    const volume = this._button("🔇", locale.unmute, "yvsl-volume");
    const progress = element("input", "yvsl-progress", {
      type: "range",
      min: 0,
      max: 1000,
      step: 1,
      value: 0,
      "aria-label": locale.progress
    });
    const time = element("span", "yvsl-time", { text: "0:00", "aria-hidden": "true" });
    const speed = element("select", "yvsl-speed", { "aria-label": locale.speed });
    speed.hidden = !this.options.controls.speed;
    const fullscreen = this._button("⛶", locale.fullscreen, "yvsl-fullscreen");
    const stickyClose = this._button("×", locale.close, "yvsl-sticky-close");

    if (!this.options.controls.play) play.hidden = true;
    if (!this.options.controls.volume) volume.hidden = true;
    if (!this.options.controls.progress) progress.hidden = true;
    if (!this.options.controls.fullscreen || !root.requestFullscreen) fullscreen.hidden = true;

    controls.append(play, volume, progress, time, speed, fullscreen);
    const below = element("div", "yvsl-zone yvsl-zone--below");
    root.append(stickyClose, above, message, stage, error, controls, below);
    this.mount.replaceChildren(sentinel, root);

    this.dom = { root, sentinel, above, message, stage, playerHost, stageInteraction, poster, posterImage, posterPlay, stageOverlay, topLeft, topRight, bottomLeft, bottomRight, error, controls, play, volume, progress, time, speed, fullscreen, stickyClose, below };

    this._listen(play, "click", () => this.playerState === YT_STATE.PLAYING ? this.pause() : this.play());
    this._listen(volume, "click", () => this.adapter?.isMuted?.() ? this.unmute(true) : this.mute());
    this._listen(progress, "input", () => this._seekFromProgress());
    this._listen(speed, "change", () => this._setRate(Number(speed.value)));
    this._listen(fullscreen, "click", () => this._toggleFullscreen());
    this._listen(stickyClose, "click", () => this._dismissSticky());
    this._listen(document, "fullscreenchange", () => this._updateFullscreenButton());
    if (this.options.stage.clickToToggle) {
      this._listen(stageInteraction, "click", () => this.playerState === YT_STATE.PLAYING ? this.pause() : this.play());
      this._listen(stageInteraction, "keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        this.playerState === YT_STATE.PLAYING ? this.pause() : this.play();
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
    const button = this._button("🔊", this.options.locale.unmute, "yvsl-btn--accent");
    button.textContent = this.options.locale.unmute;
    this._listen(button, "click", () => this.unmute(true));
    this._showMessage("", [button]);
  }

  _showAutoplayFallback() {
    const button = this._button("▶", this.options.locale.autoplayBlocked, "yvsl-btn--accent");
    button.textContent = this.options.locale.autoplayBlocked;
    this._listen(button, "click", () => {
      this._hideMessage();
      this.unmute(false);
      this.play();
    });
    this._showMessage("", [button]);
  }

  _showResumePrompt() {
    const continueButton = this._button("▶", this.options.locale.continue, "yvsl-btn--accent");
    continueButton.textContent = this.options.locale.continue;
    const restartButton = this._button("↺", this.options.locale.restart);
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
      if (this.stageWarmupBypassNextPlay) {
        this.stageWarmupBypassNextPlay = false;
        this.stageRevealed = true;
      } else {
        this._startStageWarmup();
      }
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
      if (!(this.stageWarmupBypassNextPlay && state === YT_STATE.BUFFERING)) {
        this.stageWarmupBypassNextPlay = false;
        this._cancelStageWarmup();
        this.stageRevealed = false;
      }
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
    if (this.stageWarmupTimer) {
      this._updateUi();
      return;
    }
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
    if (now - this.progressEventAt >= 1000) {
      this.progressEventAt = now;
      this._emit("progress");
    }
    if (now - this.saveAt >= 5000) {
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
    this.dom.play.textContent = playing ? "Ⅱ" : "▶";
    this.dom.play.title = playing ? this.options.locale.pause : this.options.locale.play;
    this.dom.play.setAttribute("aria-label", this.dom.play.title);
    this.dom.stageInteraction.setAttribute("aria-label", this.dom.play.title);
    this.dom.poster.hidden = this.options.stage.poster === false || (playing && this.stageRevealed);

    const muted = this.adapter?.isMuted?.() ?? true;
    this.dom.volume.textContent = muted ? "🔇" : "🔊";
    this.dom.volume.title = muted ? this.options.locale.unmute : this.options.locale.mute;
    this.dom.volume.setAttribute("aria-label", this.dom.volume.title);

    const duration = this.timeline.duration || 0;
    const realFraction = duration ? clamp(this.timeline.current / duration, 0, 1) : 0;
    const visualFraction = this.options.progress.mode === "smart"
      ? interpolateProgress(realFraction, this.options.progress.points)
      : realFraction;
    this.dom.progress.value = String(Math.round(visualFraction * 1000));
    this.dom.progress.setAttribute("aria-valuetext", formatTime(this.timeline.current));
    this.dom.time.textContent = formatTime(this.timeline.current);
  }

  _seekFromProgress() {
    if (!this.timeline.duration) return;
    const visual = Number(this.dom.progress.value) / 1000;
    const real = this.options.progress.mode === "smart"
      ? invertProgress(visual, this.options.progress.points)
      : visual;
    this.seek(real * this.timeline.duration);
  }

  _populateRates() {
    const rates = this.adapter?.getAvailablePlaybackRates?.() || [1];
    this.dom.speed.replaceChildren(...rates.map((rate) => element("option", "", {
      value: rate,
      text: `${rate}×`
    })));
    if (!rates.includes(this.options.playback.rate)) {
      this.dom.speed.append(element("option", "", { value: this.options.playback.rate, text: `${this.options.playback.rate}×` }));
    }
    this.dom.speed.value = String(this.options.playback.rate);
  }

  _setRate(rate) {
    this.timeline.rate = Number(rate) || 1;
    this.adapter?.setPlaybackRate?.(this.timeline.rate);
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
    this.stageWarmupWasMuted = this.adapter?.isMuted?.() ?? true;
    if (!this.stageWarmupWasMuted) this.adapter?.mute?.();
    this.dom.posterPlay.textContent = "…";
    this.stageWarmupTimer = window.setTimeout(() => {
      this.stageWarmupTimer = null;
      if (this.destroyed || this.playerState !== YT_STATE.PLAYING) return;
      this.stageWarmupBypassNextPlay = true;
      this.adapter?.seekTo?.(this.timeline.start + returnPosition);
      this.timeline.current = returnPosition;
      this.timeline.resetClock();
      if (this.stageWarmupWasMuted === false) this.adapter?.unmute?.();
      this.stageWarmupWasMuted = null;
      this.stageRevealed = true;
      this.dom.posterPlay.textContent = "▶";
      this._updateUi();
    }, delay);
  }

  _cancelStageWarmup() {
    if (this.stageWarmupTimer) window.clearTimeout(this.stageWarmupTimer);
    this.stageWarmupTimer = null;
    if (this.stageWarmupWasMuted === false) this.adapter?.unmute?.();
    this.stageWarmupWasMuted = null;
    if (this.dom?.posterPlay) this.dom.posterPlay.textContent = "▶";
  }

  _renderTimedItems() {
    for (const item of this.options.hooks) {
      const node = element("p", "yvsl-hook", { text: String(item.text || ""), hidden: true });
      this._zone(item.placement).append(node);
      this.timedNodes.push({ type: "hook", item, node, shown: false });
    }

    for (const item of this.options.ctas) {
      const safeUrl = toSafeUrl(item.url, location.href);
      const node = safeUrl
        ? element("a", "yvsl-cta", { text: String(item.text || "Перейти"), href: safeUrl, target: item.target || "_self" })
        : element("button", "yvsl-cta", { text: String(item.text || "Показать предложение"), type: "button" });
      this._applyCtaColors(node, item);
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

  _applyCtaColors(node, item) {
    const supportsColor = (value) => typeof value === "string" && (!globalThis.CSS?.supports || globalThis.CSS.supports("color", value));
    if (supportsColor(item.background)) node.style.backgroundColor = item.background;
    if (supportsColor(item.color)) node.style.color = item.color;
  }

  _zone(placement) {
    return ({
      above: this.dom.above,
      below: this.dom.below,
      "top-left": this.dom.topLeft,
      "top-right": this.dom.topRight,
      "bottom-left": this.dom.bottomLeft,
      "bottom-right": this.dom.bottomRight
    })[placement] || this.dom.below;
  }

  _prepareReveal(item) {
    if (!item.reveal) return;
    let nodes = [];
    try { nodes = document.querySelectorAll(item.reveal); } catch { return; }
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
        // Invalid selectors are ignored and do not stop playback.
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
      const active = unlocked || (current >= item.start && current <= item.end);
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
            // Ignore invalid selectors.
          }
        }
      }
    }
  }

  _setupPopup() {
    const popup = this.options.popup;
    if (!popup) return;
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
    const close = this._button("×", this.options.locale.close, "yvsl-popup-close");
    backdrop.append(close, panel);
    document.body.append(backdrop);
    this.dom.popupBackdrop = backdrop;
    this.dom.popupPanel = panel;
    this.dom.popupClose = close;
    this._listen(close, "click", () => this.close());
    this._listen(backdrop, "click", (event) => { if (event.target === backdrop) this.close(); });
    this._listen(document, "keydown", (event) => { if (event.key === "Escape" && this.popupOpen) this.close(); });
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
      this.options.sticky &&
      this.stickyOutOfView &&
      !this.stickyDismissed &&
      !this.popupOpen &&
      document.fullscreenElement !== this.dom.root &&
      this.playerState === YT_STATE.PLAYING
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
      this.dom.root.requestFullscreen?.()
        .then(() => this._updateFullscreenButton())
        .catch((error) => this._emit("error", { code: "fullscreen", message: error.message }));
    }
  }

  _updateFullscreenButton() {
    const active = document.fullscreenElement === this.dom.root;
    this._applySticky();
    this.dom.fullscreen.textContent = active ? "×" : "⛶";
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
      position: ownsPosition ? (this.completed ? 0 : this.timeline.current) : existing.position,
      maxWatched: Math.max(existing.maxWatched || 0, this.timeline.maxWatched),
      unlocks: [...new Set([...(existing.unlocks || []), ...this.unlocks])],
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
    if (this.options.popup && !this.popupOpen) this.open();
    if (!this.readyState) {
      this.pendingPlay = true;
      this.ready = this._ensureAdapterMounted();
      this.ready.then(() => {
        if (!this.destroyed && this.pendingPlay) {
          this.pendingPlay = false;
          this.adapter?.play();
        }
      }).catch(() => { this.pendingPlay = false; });
      return this;
    }
    this.pendingPlay = false;
    this.adapter.play();
    return this;
  }

  pause() {
    this.pendingPlay = false;
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
    this.dom.root.classList.remove("yvsl-root--popup-idle");
    this.dom.root.removeAttribute("aria-hidden");
    this.dom.popupPanel.append(this.dom.root);
    this.dom.popupBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    this.dom.popupClose.focus();
    this.ready = this._ensureAdapterMounted();
    return this;
  }

  close() {
    if (!this.popupOpen) return this;
    this.pendingPlay = false;
    this.pause();
    this.popupOpen = false;
    this.mount.append(this.dom.root);
    this.dom.popupBackdrop.hidden = true;
    document.body.style.overflow = "";
    if (this.options.popup) {
      this.dom.root.classList.add("yvsl-root--popup-idle");
      this.dom.root.setAttribute("aria-hidden", "true");
    }
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
    this._cancelStageWarmup();
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
}

function safeLocalStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}
