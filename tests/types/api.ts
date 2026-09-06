import { create, autoInit, normalizeOptions, interpolateProgress, DEFAULT_PROGRESS_POINTS } from "yellow-vsl";
const player = create("#video", {
  video: "M7lc1UVf-VE", storageKey: "hero", playback: { autoplay: false, resume: "auto", start: 10, end: 20 },
  captions: { enabled: true, language: "ru" },
  ctas: [{ start: 1, reveal: "#offer", placement: "bottom-right" }]
});
await player.ready;
player.enableCaptions("ru").unmute().play().pause();
const seconds: number = player.seek(1);
const language: string | null = player.getState().captionLanguage;
document.addEventListener("yellowvsl:cta-click", event => event.detail.cta.toUpperCase());
autoInit(document.body);
normalizeOptions({ progress: { points: DEFAULT_PROGRESS_POINTS } });
interpolateProgress(seconds);
window.YellowVSL.create("#another", { video: "M7lc1UVf-VE" });
// @ts-expect-error Unsupported autoplay modes must be rejected in integrations.
create("#bad", { video: "M7lc1UVf-VE", playback: { autoplay: "loud" } });
void language;
