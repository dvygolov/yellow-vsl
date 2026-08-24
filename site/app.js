const video = "https://www.youtube.com/watch?v=Y7jHPB7FjhM";
const eventLog = document.querySelector("#event-log");
const eventCount = document.querySelector("#event-count");
const eventLines = [];
let totalEvents = 0;

const heroPlayer = YellowVSL.create("#hero-player", {
  video,
  playback: { autoplay: "smart", resume: false, end: 60 },
  progress: { mode: "smart" },
  controls: { speed: false },
  theme: { accent: "#ffd400", radius: "0px" }
});

const examplePlayer = YellowVSL.create("#example-player", {
  video,
  sticky: { position: "bottom-right", width: "370px" },
  playback: { autoplay: false, resume: "ask", end: 60 },
  controls: { speed: true },
  hooks: [{ id: "site-hook", start: 2, end: 5.5, text: "Mini-hook: CTA появится на шестой секунде", placement: "top-left" }],
  ctas: [{ id: "site-offer", start: 6, text: "Открыть предложение", reveal: "#example-offer", placement: "bottom-right", persist: false }]
});

const verticalPlayer = YellowVSL.create("#vertical-player", {
  video,
  aspectRatio: "9/16",
  playback: { autoplay: false, resume: false, start: 10, end: 16, loop: true, rate: 1.5 },
  progress: { mode: "real" },
  controls: { speed: true },
  theme: { accent: "#72e5ff", radius: "16px" }
});

const popupPlayer = YellowVSL.create("#popup-player", {
  video,
  popup: { trigger: "#open-popup" },
  playback: { autoplay: false, resume: false },
  progress: { mode: "hidden" },
  theme: { accent: "#ff7ad9" }
});

window.yellowVslSite = { heroPlayer, examplePlayer, verticalPlayer, popupPlayer };

document.querySelector("#example-unmute").addEventListener("click", () => examplePlayer.unmute(true));
document.querySelector("#example-forward").addEventListener("click", () => {
  const before = examplePlayer.getState().maxWatched;
  const requested = before + 60;
  const actual = examplePlayer.seek(requested);
  showResult(actual <= before + 0.05, `Просмотрено до ${before.toFixed(1)} с. Запрошено ${requested.toFixed(1)} с, фактически ${actual.toFixed(1)} с — переход вперёд заблокирован.`);
});
document.querySelector("#example-back").addEventListener("click", () => {
  const state = examplePlayer.getState();
  if (state.maxWatched < 2) {
    showResult(false, "Сначала посмотрите хотя бы две секунды.");
    return;
  }
  const requested = Math.max(0, state.maxWatched - 2);
  const actual = examplePlayer.seek(requested);
  showResult(Math.abs(actual - requested) < 0.1, `Возврат к ${actual.toFixed(1)} с разрешён: эта часть уже была просмотрена.`);
});
document.querySelector("#vertical-start").addEventListener("click", () => verticalPlayer.play());
document.querySelector("#copy-code").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(document.querySelector("#install-code").textContent);
    button.textContent = "Скопировано";
  } catch {
    button.textContent = "Выделите код";
  }
  window.setTimeout(() => { button.textContent = "Копировать"; }, 1800);
});

for (const name of ["ready", "view", "play", "pause", "progress", "resume", "complete", "cta-show", "cta-click", "error"]) {
  document.addEventListener(`yellowvsl:${name}`, (event) => {
    if (name === "progress" && Math.floor(Number(event.detail.currentTime || 0) * 2) % 2 !== 0) return;
    totalEvents += 1;
    eventCount.textContent = String(totalEvents);
    eventLines.unshift(JSON.stringify({
      event: name,
      player: event.detail.instance?.id,
      time: Number(event.detail.currentTime || 0).toFixed(1),
      cta: event.detail.cta,
      code: event.detail.code
    }));
    eventLines.splice(12);
    eventLog.textContent = eventLines.join("\n");
  });
}

Promise.all([heroPlayer.ready, examplePlayer.ready, verticalPlayer.ready, popupPlayer.ready]).then(() => {
  document.documentElement.dataset.playersReady = "true";
});

function showResult(passed, message) {
  const result = document.querySelector("#example-result");
  result.dataset.state = passed ? "pass" : "fail";
  result.textContent = `${passed ? "✓" : "✕"} ${message}`;
}
