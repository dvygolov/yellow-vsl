export const STYLES = `
.yvsl-root {
  --yvsl-accent: #ffd400;
  --yvsl-bg: #111214;
  --yvsl-panel: #1b1d21;
  --yvsl-text: #ffffff;
  --yvsl-muted: #a7abb4;
  --yvsl-radius: 14px;
  --yvsl-shadow: 0 18px 50px rgba(0, 0, 0, .28);
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  color: var(--yvsl-text);
  background: var(--yvsl-bg);
  border-radius: var(--yvsl-radius);
  box-shadow: var(--yvsl-shadow);
  overflow: hidden;
  font: 500 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  z-index: 0;
}
.yvsl-root *, .yvsl-root *::before, .yvsl-root *::after { box-sizing: border-box; }
.yvsl-root button, .yvsl-root select, .yvsl-root input { font: inherit; }
.yvsl-stage {
  width: 100%;
  aspect-ratio: var(--yvsl-aspect, 16 / 9);
  background: #000;
}
.yvsl-stage > div, .yvsl-stage iframe { width: 100% !important; height: 100% !important; display: block; border: 0; }
.yvsl-zone { display: grid; gap: 8px; }
.yvsl-zone:empty { display: none; }
.yvsl-zone--above { padding: 12px 14px 0; }
.yvsl-zone--below { padding: 0 14px 12px; }
.yvsl-hook {
  margin: 0;
  padding: 10px 12px;
  color: var(--yvsl-text);
  background: color-mix(in srgb, var(--yvsl-accent) 16%, transparent);
  border-left: 3px solid var(--yvsl-accent);
  border-radius: 8px;
  text-align: center;
}
.yvsl-cta {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 44px;
  padding: 10px 18px;
  color: #111;
  background: var(--yvsl-accent);
  border: 0;
  border-radius: 10px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}
.yvsl-message {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 14px;
  color: var(--yvsl-text);
  background: var(--yvsl-panel);
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}
.yvsl-message[hidden] { display: none; }
.yvsl-message__text { flex: 1 1 220px; text-align: center; }
.yvsl-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 40px;
  min-height: 40px;
  padding: 8px 12px;
  color: var(--yvsl-text);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 9px;
  cursor: pointer;
}
.yvsl-btn:hover { background: rgba(255, 255, 255, .08); }
.yvsl-btn:focus-visible, .yvsl-progress:focus-visible, .yvsl-cta:focus-visible, .yvsl-speed:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--yvsl-accent) 70%, white);
  outline-offset: 2px;
}
.yvsl-btn--accent { color: #111; background: var(--yvsl-accent); border-color: var(--yvsl-accent); font-weight: 800; }
.yvsl-controls {
  display: grid;
  grid-template-columns: auto auto minmax(90px, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--yvsl-panel);
}
.yvsl-progress {
  width: 100%;
  height: 24px;
  margin: 0;
  padding: 0;
  accent-color: var(--yvsl-accent);
  cursor: pointer;
}
.yvsl-progress[hidden] { display: none; }
.yvsl-time { min-width: 42px; color: var(--yvsl-muted); font-variant-numeric: tabular-nums; text-align: center; }
.yvsl-speed {
  min-height: 40px;
  padding: 6px 8px;
  color: var(--yvsl-text);
  background: var(--yvsl-bg);
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 9px;
}
.yvsl-error { padding: 28px 18px; color: #fff; background: #35151a; text-align: center; }
.yvsl-error[hidden] { display: none; }
.yvsl-sticky-sentinel { width: 1px; height: 1px; pointer-events: none; }
.yvsl-root--sticky {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: var(--yvsl-sticky-width, min(420px, calc(100vw - 24px)));
  z-index: 2147483000;
}
.yvsl-sticky-close { display: none; position: absolute; top: 8px; right: 8px; z-index: 2; background: rgba(0,0,0,.72); }
.yvsl-root--sticky .yvsl-sticky-close { display: inline-flex; }
.yvsl-popup-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(0, 0, 0, .78);
  z-index: 2147483001;
}
.yvsl-popup-backdrop[hidden] { display: none; }
.yvsl-popup-panel { width: min(960px, 100%); max-height: calc(100vh - 44px); overflow: auto; }
.yvsl-popup-close { position: fixed; top: 14px; right: 14px; z-index: 1; background: #111; }
.yvsl-root:fullscreen { width: 100%; height: 100%; border-radius: 0; display: flex; flex-direction: column; justify-content: center; }
.yvsl-root:fullscreen .yvsl-stage { max-height: calc(100vh - 76px); }
.yvsl-visually-hidden { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
@media (max-width: 520px) {
  .yvsl-controls { grid-template-columns: auto auto minmax(70px, 1fr) auto; padding: 8px; gap: 5px; }
  .yvsl-time { display: none; }
  .yvsl-btn { min-width: 38px; padding: 7px 9px; }
  .yvsl-root--sticky { right: 8px; bottom: 8px; width: calc(100vw - 16px); }
}
@media (prefers-reduced-motion: reduce) {
  .yvsl-root *, .yvsl-root *::before, .yvsl-root *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}
`;

let installed = false;

export function installStyles(doc = globalThis.document, nonce = null) {
  if (!doc || installed || doc.getElementById("yellow-vsl-styles")) return;
  const style = doc.createElement("style");
  style.id = "yellow-vsl-styles";
  if (nonce) style.nonce = nonce;
  style.textContent = STYLES;
  (doc.head || doc.documentElement).append(style);
  installed = true;
}
