import { optionsFromDataset } from "./config.js";
import { YellowVSLPlayer } from "./player.js";
import packageInfo from "../package.json" with { type: "json" };

export const version = packageInfo.version;
const autoInstances = new WeakMap();

/** @param {string | Element} target @param {import('../types/index.js').PlayerOptions} options */
export function create(target, options = {}) {
  return new YellowVSLPlayer(target, options);
}

/** Reuse live declarative players; recreate instances that have been destroyed. */
export function autoInit(root = document) {
  const nodes = [];
  if (root instanceof Element && root.matches("[data-yellow-vsl]")) nodes.push(root);
  nodes.push(...root.querySelectorAll("[data-yellow-vsl]"));

  return nodes.map((node) => {
    if (autoInstances.has(node) && !autoInstances.get(node).destroyed) return autoInstances.get(node);
    try {
      const instance = create(node, optionsFromDataset(node));
      autoInstances.set(node, instance);
      return instance;
    } catch (error) {
      node.dispatchEvent(new CustomEvent("yellowvsl:error", {
        detail: { code: "config", message: error.message },
        bubbles: true
      }));
      node.textContent = error.message;
      node.setAttribute("role", "alert");
      return null;
    }
  }).filter(Boolean);
}

export { YellowVSLPlayer } from "./player.js";
export {
  DEFAULT_PROGRESS_POINTS,
  formatTime,
  interpolateProgress,
  invertProgress,
  parseYouTubeId,
  validateProgressPoints
} from "./utils.js";
export { normalizeOptions } from "./config.js";

const api = { create, autoInit, version };

if (typeof window !== "undefined") {
  window.YellowVSL = Object.assign(window.YellowVSL || {}, api);
}
