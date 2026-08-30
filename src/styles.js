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
  position: relative;
  width: 100%;
  aspect-ratio: var(--yvsl-aspect, 16 / 9);
  overflow: hidden;
  background: #000;
}
.yvsl-player-host { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; }
.yvsl-player-host > div, .yvsl-player-host iframe, .yvsl-stage > iframe { width: 100% !important; height: 100% !important; display: block; border: 0; pointer-events: none !important; }
.yvsl-stage > iframe.yvsl-player-host { top: -1000px !important; bottom: auto !important; height: calc(100% + 2000px) !important; }
.yvsl-stage-interaction { position: absolute; inset: 0; z-index: 1; }
.yvsl-stage-interaction[role="button"] { cursor: pointer; }
.yvsl-stage-interaction:focus-visible { outline: 3px solid color-mix(in srgb, var(--yvsl-accent) 70%, white); outline-offset: -5px; }
.yvsl-poster { position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; overflow: hidden; background: #000; pointer-events: none; }
.yvsl-poster[hidden] { display: none; }
.yvsl-poster__image { width: 100%; height: 100%; object-fit: cover; opacity: .78; }
.yvsl-poster__play { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: clamp(58px, 11%, 92px); aspect-ratio: 1; padding-left: .08em; color: #171400; background: var(--yvsl-accent); border-radius: 50%; box-shadow: 0 18px 45px rgba(0,0,0,.38); font-size: clamp(24px, 4vw, 38px); transform: translate(-50%, -50%); }
.yvsl-stage-overlay { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.yvsl-zone--corner { position: absolute; display: grid; gap: 8px; width: max-content; max-width: min(46%, 380px); pointer-events: none; }
.yvsl-zone--corner:empty { display: none; }
.yvsl-zone--corner .yvsl-cta, .yvsl-zone--corner .yvsl-hook { width: max-content; max-width: 100%; pointer-events: auto; box-shadow: 0 8px 30px rgba(0,0,0,.34); }
.yvsl-zone--top-left { top: 14px; left: 14px; justify-items: start; }
.yvsl-zone--top-right { top: 14px; right: 14px; justify-items: end; }
.yvsl-zone--bottom-left { bottom: 14px; left: 14px; justify-items: start; }
.yvsl-zone--bottom-right { right: 14px; bottom: 14px; justify-items: end; }
.yvsl-zone { display: grid; gap: 8px; }
.yvsl-zone:empty { display: none; }
.yvsl-zone--above { padding: 12px 14px 0; }
.yvsl-zone--below { padding: 0 14px 12px; }
.yvsl-root .yvsl-hook {
  margin: 0;
  padding: 10px 12px;
  color: #fff;
  background: rgba(8, 10, 12, .92);
  border: 1px solid rgba(255,255,255,.2);
  border-left: 4px solid var(--yvsl-accent);
  border-radius: 8px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,.72);
  backdrop-filter: blur(8px);
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
.yvsl-play.yvsl-is-loading, .yvsl-poster__play.yvsl-is-loading { color: transparent; font-size: 0; padding: 0; }
.yvsl-play.yvsl-is-loading::after, .yvsl-poster__play.yvsl-is-loading::after {
  content: "";
  display: block;
  flex: none;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,.36);
  border-top-color: var(--yvsl-accent);
  border-right-color: var(--yvsl-accent);
  border-radius: 50%;
  animation: yvsl-spin .72s linear infinite;
  transform-origin: center;
  will-change: transform;
}
.yvsl-poster__play.yvsl-is-loading::after { width: clamp(26px, 4vw, 36px); height: clamp(26px, 4vw, 36px); border-width: 4px; border-color: rgba(23,20,0,.25); border-top-color: #171400; border-right-color: #171400; }
@keyframes yvsl-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .yvsl-is-loading::after { animation-duration: 1.6s; } }
.yvsl-btn:focus-visible, .yvsl-progress:focus-visible, .yvsl-cta:focus-visible, .yvsl-speed:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--yvsl-accent) 70%, white);
  outline-offset: 2px;
}
.yvsl-btn--accent { color: #111; background: var(--yvsl-accent); border-color: var(--yvsl-accent); font-weight: 800; }
.yvsl-controls {
  display: grid;
  grid-template-columns: auto auto minmax(90px, 1fr) auto auto auto;
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
.yvsl-sticky-close { display: none; position: absolute; top: 8px; right: 8px; z-index: 6; width: 44px; height: 44px; min-width: 44px; min-height: 44px; padding: 0; background: rgba(0,0,0,.78); border-radius: 50%; box-shadow: 0 4px 18px rgba(0,0,0,.4); font-size: 22px; }
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
.yvsl-root--popup-idle { position: fixed !important; top: 0 !important; left: -100000px !important; width: min(960px, 100vw) !important; opacity: 0; pointer-events: none; }
.yvsl-popup-panel { width: min(960px, 100%); max-height: calc(100vh - 44px); overflow: auto; }
.yvsl-popup-close { position: fixed; top: 14px; right: 14px; z-index: 1; background: #111; }
.yvsl-root:fullscreen { position: relative; width: 100vw; height: 100vh; height: 100dvh; border-radius: 0; background: #000; box-shadow: none; }
.yvsl-root:fullscreen .yvsl-stage { width: 100%; height: 100%; max-height: none; aspect-ratio: auto; }
.yvsl-root:fullscreen .yvsl-controls {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  padding-top: 28px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: linear-gradient(transparent, rgba(0, 0, 0, .88) 44%);
  transition: opacity .22s ease, transform .22s ease;
}
.yvsl-root:fullscreen.yvsl-controls-hidden .yvsl-controls { opacity: 0; transform: translateY(105%); pointer-events: none; }
.yvsl-visually-hidden { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
@media (max-width: 520px) {
  .yvsl-controls { grid-template-columns: auto auto minmax(70px, 1fr) auto auto; padding: 8px; gap: 5px; }
  .yvsl-time { display: none; }
  .yvsl-btn { min-width: 38px; padding: 7px 9px; }
  .yvsl-root--sticky { right: 8px; bottom: 8px; width: calc(100vw - 16px); }
  .yvsl-zone--corner { max-width: calc(100% - 20px); }
  .yvsl-zone--top-left { top: 10px; left: 10px; }
  .yvsl-zone--top-right { top: 10px; right: 10px; }
  .yvsl-zone--bottom-left { bottom: 10px; left: 10px; }
  .yvsl-zone--bottom-right { right: 10px; bottom: 10px; }
  .yvsl-popup-backdrop { padding: 0; background: #000; }
  .yvsl-popup-panel { width: 100%; max-height: 100vh; max-height: 100dvh; overflow: hidden; }
  .yvsl-popup-panel .yvsl-root { border-radius: 0; box-shadow: none; }
  .yvsl-popup-close { top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); }
}
@media (prefers-reduced-motion: reduce) {
  .yvsl-root *, .yvsl-root *::before, .yvsl-root *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  .yvsl-root .yvsl-play.yvsl-is-loading::after, .yvsl-root .yvsl-poster__play.yvsl-is-loading::after { animation: yvsl-spin 1.6s linear infinite !important; }
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
