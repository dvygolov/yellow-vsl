import test from "node:test";
import assert from "node:assert/strict";
import { ProgressStorage, createStorageKey } from "../../src/storage.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("ProgressStorage сохраняет позицию, максимум и уникальные unlocks", () => {
  const memory = new MemoryStorage();
  const storage = new ProgressStorage(memory, "test");
  assert.equal(storage.save({ position: 8, maxWatched: 12, unlocks: ["offer", "offer"] }), true);
  const result = storage.load();
  assert.equal(result.position, 8);
  assert.equal(result.maxWatched, 12);
  assert.deepEqual(result.unlocks, ["offer"]);
});

test("ProgressStorage удаляет просроченную запись", () => {
  const memory = new MemoryStorage();
  memory.setItem("old", JSON.stringify({ position: 5, maxWatched: 5, updatedAt: Date.now() - 2000 }));
  const storage = new ProgressStorage(memory, "old", 1000);
  assert.deepEqual(storage.load(), { position: 0, maxWatched: 0, unlocks: [], activeAt: 0, updatedAt: 0 });
  assert.equal(memory.getItem("old"), null);
});

test("ключ изолирует разные фрагменты одного видео", () => {
  assert.notEqual(createStorageKey("video", 0, null), createStorageKey("video", 10, 20));
});
