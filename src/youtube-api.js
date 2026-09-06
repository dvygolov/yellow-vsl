const API_URL = "https://www.youtube.com/iframe_api";
const apiLoads = new WeakMap();

export function loadYouTubeAPI(win = globalThis.window) {
  if (!win?.document) return Promise.reject(new Error("YouTube API доступен только в браузере"));
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
        reject(new Error("Не удалось загрузить YouTube IFrame API"));
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
      reject(new Error("YouTube IFrame API не ответил вовремя"));
    }, 20000);
  });

  apiLoads.set(win, apiPromise);
  return apiPromise;
}

export class YouTubeAdapter {
  constructor({ element, videoId, playerVars = {}, events = {}, win = globalThis.window, timeout = 20000 }) {
    this.element = element;
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
        new Promise((resolve, reject) => { this.cancelLoad = () => reject(abortError()); })
      ]);
    } finally { this.cancelLoad = null; }
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
        if (error) reject(error); else resolve();
      };
      const timer = clock.setTimeout(() => {
        const error = new Error("YouTube Player не ответил вовремя");
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
              try { this.events.ready?.(event); finish(); } catch (error) { finish(error); }
            },
            onStateChange: (event) => { if (!this.destroyed) this.events.stateChange?.(event.data, event); },
            onPlaybackRateChange: (event) => { if (!this.destroyed) this.events.rateChange?.(event.data, event); },
            onApiChange: (event) => { if (!this.destroyed) this.events.apiChange?.(event); },
            onAutoplayBlocked: (event) => { if (!this.destroyed) this.events.autoplayBlocked?.(event); },
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
      } catch (error) { finish(error); }
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
    this.destroyed = true;
    this.cancelLoad?.();
    this.cancelMount?.();
    this.player?.destroy?.();
    this.player = null;
  }
}

function abortError() {
  const error = new Error("YouTube Player initialization cancelled");
  error.name = "AbortError";
  return error;
}

export const YT_STATE = Object.freeze({
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
});
