const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export class ProgressStorage {
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
      // Storage may be disabled by the browser.
    }
  }

  empty() {
    return { position: 0, maxWatched: 0, unlocks: [], activeAt: 0, updatedAt: 0 };
  }
}

export function createStorageKey(videoId, start, end) {
  return `yellowvsl:v1:${videoId}:${Number(start) || 0}:${end == null ? "end" : Number(end)}`;
}
