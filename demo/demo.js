const video = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
const demoParams = new URLSearchParams(location.search);
const mainAutoplay = demoParams.get("autoplay") === "false" ? false : "smart";
const eventLog = document.querySelector("#event-log");
const eventCount = document.querySelector("#event-count");
const eventLines = [];
let totalEvents = 0;
let segmentCompletions = 0;

const mainPlayer = window.YellowVSL.create("#main-player", {
  video,
  sticky: { position: "bottom-right", width: "390px" },
  controls: { speed: true },
  playback: { autoplay: mainAutoplay, end: 60 },
  hooks: [{ id: "mini-hook", start: 2, end: 5.5, text: "Mini-hook работает: оффер появится на шестой секунде", placement: "top-left" }],
  ctas: [{ id: "demo-offer", start: 6, text: "Перейти к открытому предложению", reveal: "#offer", placement: "bottom-right", persist: true }]
});

const segmentPlayer = window.YellowVSL.create("#segment-player", {
  video,
  aspectRatio: "9/16",
  playback: { autoplay: false, resume: false, start: 10, end: 16, loop: true, rate: 1.5 },
  progress: { mode: "real" },
  controls: { speed: true },
  theme: { accent: "#72e5ff", radius: "18px" }
});

const popupPlayer = window.YellowVSL.create("#popup-player", {
  video,
  popup: { trigger: "#open-popup" },
  playback: { autoplay: false, resume: false },
  progress: { mode: "hidden" },
  theme: { accent: "#ff7ad9" }
});

window.demo = { mainPlayer, segmentPlayer, popupPlayer };

for (const name of ["ready", "view", "play", "pause", "progress", "resume", "complete", "cta-show", "cta-click", "error"]) {
  document.addEventListener(`yellowvsl:${name}`, (event) => {
    if (name === "progress" && Math.floor(event.detail.currentTime * 2) % 2 !== 0) return;
    if (name === "complete" && event.detail.instance === segmentPlayer) { segmentCompletions += 1; updateSegmentResult(); }
    totalEvents += 1;
    eventCount.textContent = `${totalEvents} событий`;
    const payload = { event: name, player: event.detail.instance?.id, time: Number(event.detail.currentTime || 0).toFixed(1), max: Number(event.detail.maxWatched || 0).toFixed(1), cta: event.detail.cta, code: event.detail.code };
    eventLines.unshift(JSON.stringify(payload));
    eventLines.splice(16);
    eventLog.textContent = eventLines.join("\n");
    updateMainState();
  });
}

document.querySelector("#demo-unmute").addEventListener("click", () => mainPlayer.unmute(true));
document.querySelector("#test-forward").addEventListener("click", () => {
  const before = mainPlayer.getState().maxWatched;
  const requested = before + 60;
  const actual = mainPlayer.seek(requested);
  showResult("#seek-result", actual <= before + 0.05, `Forward seek: просмотрено до ${before.toFixed(1)} с, запрошено ${requested.toFixed(1)} с, фактически ${actual.toFixed(1)} с. ${actual <= before + 0.05 ? "Переход вперёд заблокирован." : "Ошибка: плеер ушёл вперёд."}`);
});
document.querySelector("#test-backward").addEventListener("click", () => {
  const before = mainPlayer.getState().maxWatched;
  if (before < 2.5) { showResult("#seek-result", false, "Для проверки назад сначала посмотрите хотя бы 3 секунды."); return; }
  const requested = before - 2;
  const actual = mainPlayer.seek(requested);
  showResult("#seek-result", Math.abs(actual - requested) < 0.1, `Backward seek: просмотрено до ${before.toFixed(1)} с, запрошено ${requested.toFixed(1)} с, фактически ${actual.toFixed(1)} с. ${Math.abs(actual - requested) < 0.1 ? "Возврат назад разрешён." : "Ошибка возврата."}`);
});
document.querySelector("#save-resume").addEventListener("click", () => {
  const state = mainPlayer.getState();
  if (state.currentTime < 3) { showResult("#seek-result", false, "Для Resume сначала посмотрите минимум 3 секунды."); return; }
  mainPlayer.pause();
  showResult("#seek-result", true, `Позиция ${state.currentTime.toFixed(1)} с сохранена. Перезагрузка…`);
  window.setTimeout(() => location.reload(), 350);
});
document.querySelector("#reset-demo").addEventListener("click", () => {
  mainPlayer.destroy();
  segmentPlayer.destroy();
  popupPlayer.destroy();
  for (let index = localStorage.length - 1; index >= 0; index -= 1) { const key = localStorage.key(index); if (key?.startsWith("yellowvsl:")) localStorage.removeItem(key); }
  location.reload();
});
document.querySelector("#play-segment").addEventListener("click", () => segmentPlayer.play());
document.querySelector("#test-single").addEventListener("click", async () => {
  showPending("#interaction-result", "Проверка выполняется: запускаем основной плеер…");
  mainPlayer.play();
  const mainStarted = await waitFor(() => mainPlayer.getState().playerState === 1);
  if (mainStarted) segmentPlayer.play();
  const settled = mainStarted && await waitFor(() => {
    const mainState = mainPlayer.getState();
    const segmentState = segmentPlayer.getState();
    return mainState.playerState !== 1 && segmentState.playerState === 1;
  });
  const mainState = mainPlayer.getState();
  const segmentState = segmentPlayer.getState();
  showResult("#interaction-result", settled, `Основной: ${stateName(mainState.playerState)}; фрагмент: ${stateName(segmentState.playerState)}. ${settled ? "Одновременно играет только один экземпляр." : "Проверка не пройдена за 5 секунд."}`);
});
document.querySelector("#test-error").addEventListener("click", () => {
  const mount = document.querySelector("#error-mount");
  mount.replaceChildren();
  mount.dataset.yellowVsl = "";
  mount.dataset.video = "это не YouTube URL";
  window.YellowVSL.autoInit(mount);
  const passed = /корректный URL/i.test(mount.textContent);
  showResult("#interaction-result", passed, passed ? "Неверный URL отклонён до загрузки YouTube; сообщение показано в контейнере." : "Ошибка URL не была показана.");
});

window.setInterval(() => { updateMainState(); updateSegmentResult(); }, 250);
Promise.all([mainPlayer.ready, segmentPlayer.ready, popupPlayer.ready]).then(() => {
  updateMainState();
  updateSegmentResult();
  document.documentElement.dataset.demoReady = "true";
});

function updateMainState() {
  const state = mainPlayer.getState();
  const real = state.duration ? state.currentTime / state.duration : 0;
  const visual = window.YellowVSL.interpolateProgress(real);
  setText("#state-playback", stateName(state.playerState));
  setText("#state-current", `${state.currentTime.toFixed(1)} с`);
  setText("#state-max", `${state.maxWatched.toFixed(1)} с`);
  setText("#state-visual", `${Math.round(visual * 100)}%`);
  setText("#state-muted", state.muted ? "выключен" : "включён");
  setText("#state-rate", `${state.rate}×`);
}

function updateSegmentResult() {
  const state = segmentPlayer.getState();
  const node = document.querySelector("#segment-result");
  node.textContent = `Циклов завершено: ${segmentCompletions} · состояние: ${stateName(state.playerState)} · ${state.currentTime.toFixed(1)} / ${state.duration.toFixed(1)} с · ${state.rate}×`;
  if (segmentCompletions > 0 && state.playerState === 1) node.dataset.status = "pass";
}

function showResult(selector, passed, message) { const node = document.querySelector(selector); node.dataset.status = passed ? "pass" : "fail"; node.textContent = `${passed ? "✓" : "✕"} ${message}`; }
function showPending(selector, message) { const node = document.querySelector(selector); node.dataset.status = "pending"; node.textContent = `… ${message}`; }
async function waitFor(predicate, timeout = 5000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  return false;
}
function setText(selector, value) { const node = document.querySelector(selector); if (node) node.textContent = value; }
function stateName(value) { return ({ [-1]: "не запущен", 0: "завершён", 1: "воспроизведение", 2: "пауза", 3: "буферизация", 5: "готов" })[value] || String(value); }
