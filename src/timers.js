/** Timers owned by one component; disposal also covers deferred one-shot work. */
export class TimerRegistry {
  constructor(clock = globalThis.window) { this.clock = clock; this.pending = new Map(); this.disposed = false; }
  timeout(callback, delay) {
    if (this.disposed) return null;
    const id = this.clock.setTimeout(() => { this.pending.delete(id); callback(); }, delay);
    this.pending.set(id, "timeout");
    return id;
  }
  interval(callback, delay) {
    if (this.disposed) return null;
    const id = this.clock.setInterval(callback, delay);
    this.pending.set(id, "interval");
    return id;
  }
  clear(id) {
    if (id == null) return;
    this.clock.clearTimeout(id);
    this.clock.clearInterval(id);
    this.pending.delete(id);
  }
  clearAll() { for (const id of this.pending.keys()) this.clear(id); }
  dispose() { this.disposed = true; this.clearAll(); }
}
