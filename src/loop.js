import { YT_STATE } from "./youtube-api.js";

export class LoopController {
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
    if (this.player.destroyed || this.player.failed || this.player.playbackIntent === "paused" ||
        !this.player.options.playback.loop || !this.mirror || this.ready || this.preparing || this.active) return;
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
        // A stalled primary must not expose YouTube's loading frame when the
        // temporary mirror is exhausted. Keep the ordinary poster until playback resumes.
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
        primaryStableSince ??= Date.now();
        if (primaryLastTime != null && current > primaryLastTime + 0.015) advancingSamples++;
      }
      primaryLastTime = current;
      const ready = playingAtStart && advancingSamples >= 2 && Date.now() - primaryStableSince >= 250;
      if (ready || Date.now() - startedAt >= 3000) {
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

}
