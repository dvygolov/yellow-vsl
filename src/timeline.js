import { clamp } from "./utils.js";

export class PlaybackTimeline {
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
    const elapsed = this.lastTickAt == null ? 0 : Math.max(0, (now - this.lastTickAt) / 1000);
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
}

function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}
