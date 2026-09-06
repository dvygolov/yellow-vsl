import { StickyController } from "./sticky.js";
import { CaptionController } from "./captions.js";
import { LoopController } from "./loop.js";
import { normalizeOptions } from "./config.js";
import { PlayerProgress, unlockKey } from "./player-storage.js";
import { TimerRegistry } from "./timers.js";
import { ModalController } from "./modal.js";
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

import { instances } from "./instances.js";
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
    this.managedRevealElements = new Map();
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
    // Declarative users may rely exclusively on the error event. Keep ready rejectable
    // for callers without reporting an additional unhandled rejection in that case.
    this.ready.catch(() => {});
  }

  _ensureAdapterMounted() {
    if (this.destroyed || this.failed) return Promise.resolve(this);
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
            stateChange: (state) => { this.loop.mirrorState = state; },
            error: () => {
              this.loop.ready = false;
              this.loop.preparing = false;
            }
          }
        });
        try { await this.loop.mirror.mount(); }
        catch {
          this.loop.mirror.destroy();
          this.loop.mirror = null;
          return this;
        }
        if (this.destroyed || this.failed) { this.loop.mirror.destroy(); return this; }
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
    const posterPlay = element("span", "yvsl-poster__play", { text: "▶", "aria-hidden": "true" });
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
    const play = this._button("▶", locale.play, "yvsl-play");
    const volume = this._button("🔇", locale.unmute, "yvsl-volume");
    const captions = this._button("CC", locale.captionsEnable, "yvsl-captions");
    captions.hidden = true;
    captions.setAttribute("aria-pressed", "false");
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
    if (this.initialPlaybackHandled || this.destroyed || this.failed || !this.readyState ||
        (this.options.popup && !this.popupOpen)) return;
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
        const error = new RangeError("Начало фрагмента находится за пределами видео");
        error.code = "config";
        throw error;
      }
      this.timeline.setDuration(sourceDuration);
    }
    return this.timeline.duration;
  }

  _startSmartAutoplay() {
    if (this.destroyed || this.failed || this.playbackIntent === "paused" || (this.options.popup && !this.popupOpen)) return;
    this.mute();
    this.play();
    this._showUnmutePrompt();
    this.timers.timeout(() => {
      if (!this.destroyed && !this.failed && this.playbackIntent === "playing" &&
          this.playerState !== YT_STATE.PLAYING && (!this.options.popup || this.popupOpen)) this._showAutoplayFallback();
    }, 1800);
  }

  _showUnmutePrompt() {
    const label = this.options.locale.unmutePrompt || this.options.locale.unmute;
    const button = this._button("🔊", label, "yvsl-btn--accent");
    button.textContent = label;
    this._listen(button, "click", () => {
      this.unmute(true);
      this.play();
    });
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

  _onAutoplayBlocked() {
    if (this.destroyed || this.failed || this.playbackIntent !== "playing" ||
        (this.options.popup && !this.popupOpen)) return;
    this._stopPlaybackProbe();
    this.loading = false;
    this._updateUi();
    this._showAutoplayFallback();
  }

  _showResumePrompt() {
    const continueButton = this._button("▶", this.options.locale.continue, "yvsl-btn--accent");
    continueButton.textContent = this.options.locale.continue;
    const restartButton = this._button("↺", this.options.locale.restart);
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
    if (state === YT_STATE.PLAYING && (this.playbackIntent === "paused" || (this.options.popup && !this.popupOpen))) {
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
      try { this._refreshDuration(); }
      catch (error) { this._showError(error.message, error.code || "config"); return; }
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

    const endTolerance = this.options.playback.loop
      ? Math.max(0.08, this.timeline.rate * 0.06)
      : 0.2;
    if (this.timeline.duration && this.timeline.current >= this.timeline.duration - endTolerance) {
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
    const displayingVideo = presentingAsPlaying || (this.playerState === YT_STATE.BUFFERING && this.stageWasRevealedBeforeBuffering);
    this.dom.play.textContent = presentingAsPlaying ? "Ⅱ" : "▶";
    this.dom.play.classList.toggle("yvsl-is-loading", showLoading);
    this.dom.posterPlay.classList.toggle("yvsl-is-loading", showLoading);
    this.dom.play.title = showLoading ? this.options.locale.loading : (presentingAsPlaying ? this.options.locale.pause : this.options.locale.play);
    this.dom.play.setAttribute("aria-label", this.dom.play.title);
    this.dom.stageInteraction.setAttribute("aria-label", this.dom.play.title);
    this.dom.poster.hidden = this.options.stage.poster === false || (displayingVideo && this.stageRevealed);

    const muted = this._isMuted();
    this.dom.volume.textContent = muted ? "🔇" : "🔊";
    this.dom.volume.title = muted ? this.options.locale.unmute : this.options.locale.mute;
    this.dom.volume.setAttribute("aria-label", this.dom.volume.title);
    this.captions.updateButton();

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
    const selector = this._revealSelector(item);
    if (!selector) return;
    let nodes = [];
    try { nodes = document.querySelectorAll(selector); } catch { return; }
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
      // Invalid selectors are ignored and do not stop playback.
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
        // Invalid selectors are ignored and do not stop playback.
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
      const active = unlocked || (current >= item.start && current <= item.end);
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
    this._listen(document, "keydown", (event) => this.modal.handleKey(event));
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
    this.stickyController.apply();
    if (active) this._revealFullscreenControls();
    else {
      this._clearFullscreenControlsTimer();
      this.dom.root.classList.remove("yvsl-controls-hidden");
    }
    this.dom.fullscreen.textContent = active ? "×" : "⛶";
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
      }).catch(() => { this.pendingPlay = false; });
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
    this._updateUi();
    this.adapter?.pause();
    return this;
  }

  enableCaptions(language = null) { return this.captions.enable(language); }
  disableCaptions() { return this.captions.disable(); }
  toggleCaptions() { return this.captions.toggle(); }

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
    if (this.options.playback.noSeek === "forward" && requested > this.timeline.maxWatched + 0.001) {
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
    this.dom.popupPanel.append(this.dom.root);
    this.dom.popupBackdrop.hidden = false;
    this.modal.acquire();
    this.dom.popupClose.focus();
    this.ready = this._ensureAdapterMounted();
    this.ready.catch(() => {});
    this._applyInitialPlayback();
    return this;
  }

  close() {
    if (this.destroyed || !this.popupOpen) return this;
    this.pendingPlay = false;
    this.pause();
    this.popupOpen = false;
    this.mount.append(this.dom.root);
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
}
