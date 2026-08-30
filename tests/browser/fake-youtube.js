(() => {
  const PLAYING = 1;
  const PAUSED = 2;
  const ENDED = 0;

  class FakePlayer {
    constructor(host, config) {
      this.host = host;
      this.config = config;
      this.state = -1;
      this.time = Number(config.playerVars.start) || 0;
      this.duration = 100;
      this.muted = false;
      this.volume = 100;
      this.rate = 1;
      this.captionTrack = {};
      this.captionTracks = [
        { languageCode: "en", languageName: "English", displayName: "English" },
        { languageCode: "ru", languageName: "Russian", displayName: "Russian" }
      ];
      this.timer = setInterval(() => {
        if (this.state !== PLAYING) return;
        this.time += 0.1 * this.rate;
        if (this.time >= this.duration) {
          this.time = this.duration;
          this.state = ENDED;
          config.events.onStateChange({ data: ENDED, target: this });
        }
      }, 100);
      const fakeFrame = document.createElement("div");
      fakeFrame.dataset.fakeYoutube = "true";
      fakeFrame.style.cssText = "width:100%;height:100%;background:#050505";
      host.append(fakeFrame);
      queueMicrotask(() => {
        config.events.onReady({ target: this });
        config.events.onApiChange?.({ target: this });
      });
    }
    playVideo() { this.state = PLAYING; this.config.events.onStateChange({ data: PLAYING, target: this }); }
    pauseVideo() { this.state = PAUSED; this.config.events.onStateChange({ data: PAUSED, target: this }); }
    stopVideo() { this.state = PAUSED; this.time = 0; }
    mute() { this.muted = true; }
    unMute() { this.muted = false; }
    isMuted() { return this.muted; }
    setVolume(value) { this.volume = value; }
    getVolume() { return this.volume; }
    seekTo(value) { setTimeout(() => { this.time = Number(value) || 0; }, 50); }
    getCurrentTime() { return this.time; }
    getDuration() { return this.duration; }
    getPlayerState() { return this.state; }
    setPlaybackRate(value) { this.rate = Number(value) || 1; this.config.events.onPlaybackRateChange({ data: this.rate }); }
    getPlaybackRate() { return this.rate; }
    getAvailablePlaybackRates() { return [0.5, 1, 1.25, 1.5, 2]; }
    getOptions(module) { return module === "captions" ? ["track", "tracklist"] : ["captions"]; }
    getOption(module, option) {
      if (module !== "captions") return null;
      if (option === "track") return this.captionTrack;
      if (option === "tracklist") return this.captionTracks;
      return null;
    }
    setOption(module, option, value) {
      if (module === "captions" && option === "track") this.captionTrack = value || {};
    }
    destroy() { clearInterval(this.timer); this.host.replaceChildren(); }
  }

  window.YT = { Player: FakePlayer, PlayerState: { PLAYING, PAUSED, ENDED } };
})();
