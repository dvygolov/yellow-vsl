const API_URL = "https://www.youtube.com/iframe_api";
let apiPromise = null;

export function loadYouTubeAPI(win = globalThis.window) {
  if (!win?.document) return Promise.reject(new Error("YouTube API доступен только в браузере"));
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
        reject(new Error("Не удалось загрузить YouTube IFrame API"));
      }, { once: true });
      (win.document.head || win.document.documentElement).append(script);
    }

    pollTimer = win.setInterval(finish, 50);
    timeoutTimer = win.setTimeout(() => {
      if (settled) return;
      settled = true;
      win.clearInterval(pollTimer);
      apiPromise = null;
      reject(new Error("YouTube IFrame API не ответил вовремя"));
    }, 20000);
  });

  return apiPromise;
}

export class YouTubeAdapter {
  constructor({ element, videoId, playerVars = {}, events = {}, win = globalThis.window }) {
    this.element = element;
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
          onApiChange: (event) => this.events.apiChange?.(event),
          onError: (event) => {
            this.events.error?.(event.data, event);
            if (!isReady) reject(new Error(`YouTube Player error: ${event.data}`));
          }
        }
      });
    });
    return this;
  }

  play() { this.player?.playVideo?.(); }
  pause() { this.player?.pauseVideo?.(); }
  stop() { this.player?.stopVideo?.(); }
  mute() { this.player?.mute?.(); }
  unmute() { this.player?.unMute?.(); }
  isMuted() { return Boolean(this.player?.isMuted?.()); }
  setVolume(value) { this.player?.setVolume?.(value); }
  getVolume() { return Number(this.player?.getVolume?.() ?? 100); }
  seekTo(seconds, allowSeekAhead = true) { this.player?.seekTo?.(seconds, allowSeekAhead); }
  getCurrentTime() { return Number(this.player?.getCurrentTime?.() ?? 0); }
  getDuration() { return Number(this.player?.getDuration?.() ?? 0); }
  getState() { return Number(this.player?.getPlayerState?.() ?? -1); }
  setPlaybackRate(rate) { this.player?.setPlaybackRate?.(rate); }
  getPlaybackRate() { return Number(this.player?.getPlaybackRate?.() ?? 1); }
  getAvailablePlaybackRates() { return this.player?.getAvailablePlaybackRates?.() || [1]; }
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
    try { this.player?.setOption?.("captions", "track", track || {}); }
    catch { /* Captions are optional and can be unavailable for a video. */ }
  }
  reloadCaptions() {
    try { this.player?.setOption?.("captions", "reload", true); }
    catch { /* The captions module may not be ready yet. */ }
  }
  destroy() {
    this.player?.destroy?.();
    this.player = null;
  }
}

export const YT_STATE = Object.freeze({
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
});
