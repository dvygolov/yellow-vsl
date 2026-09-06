import { instances } from "./instances.js";

export class CaptionController {
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
      if (
        instance !== this.player
        && !instance.destroyed
        && instance.videoId === this.player.videoId
        && instance.adapter
        && !instance.captions.tracks.length
      ) {
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

    const activeTrack = moduleReady ? (this.player.adapter.getCaptionTrack?.() || {}) : {};
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
    return this.tracks.find((track) => track.languageCode.toLowerCase() === normalized)
      || this.tracks.find((track) => track.languageCode.toLowerCase().split("-")[0] === normalized?.split("-")[0])
      || this.tracks[0]
      || null;
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

}
