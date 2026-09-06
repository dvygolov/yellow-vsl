import { ProgressStorage, createStorageKey } from "./storage.js";

const owners = new WeakMap();

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

/** A persistent namespace identifies a particular mounted player, not its video alone. */
export class PlayerProgress {
  constructor({ mount, options, videoId, storage }) {
    const doc = mount.ownerDocument;
    const identity = options.storageKey || mount.id;
    let registered = owners.get(doc);
    if (!registered) { registered = new Set(); owners.set(doc, registered); }
    const page = doc.defaultView.location.pathname;
    this.ownerKey = identity ? JSON.stringify([page, identity]) : null;
    if (this.ownerKey && registered.has(this.ownerKey)) {
      throw new TypeError("storageKey / id должен быть уникальным для каждого экземпляра YellowVSL");
    }
    if (this.ownerKey) registered.add(this.ownerKey);
    this.release = () => { if (this.ownerKey) registered.delete(this.ownerKey); };
    let backend = storage;
    if (backend === undefined) {
      try { backend = doc.defaultView.localStorage; } catch { backend = null; }
    }
    this.storage = new ProgressStorage(identity && backend ? backend : new MemoryStorage(),
      createStorageKey(videoId, options.playback.start, options.playback.end, this.ownerKey));
  }

  save(player, overrides = {}) {
    const existing = this.storage.load();
    this.storage.save({
      position: player.completed ? 0 : player.timeline.current,
      maxWatched: Math.max(existing.maxWatched, player.timeline.maxWatched),
      unlocks: [...new Set([...existing.unlocks, ...player.unlocks])],
      activeAt: player.lastActiveAt,
      ...overrides
    });
  }
}

export function unlockKey(item) {
  // Include behavior and content so an edited/replaced offer never inherits an old unlock.
  return JSON.stringify([item.id, item.start, Number.isFinite(item.end) ? item.end : null,
    item.selector || item.reveal || "", item.url || "", item.text || "", item.persist !== false]);
}
