import * as YellowVSL from "./index.js";

if (typeof window !== "undefined") {
  window.YellowVSL = Object.assign(window.YellowVSL || {}, YellowVSL);
  const initialize = () => YellowVSL.autoInit(document);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    queueMicrotask(initialize);
  }
}
