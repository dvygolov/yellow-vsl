const video = "https://www.youtube.com/watch?v=Y7jHPB7FjhM";
const i18n = window.YellowVslSiteI18n;
i18n.apply();
const t = i18n.text;
const locale = i18n.playerLocale;
const eventLog = document.querySelector("#event-log");
const eventCount = document.querySelector("#event-count");
const eventLines = [];
let totalEvents = 0;

const heroPlayer = YellowVSL.create("#hero-player", {
  video,
  playback: { autoplay: "smart", resume: false },
  progress: { mode: "smart" },
  controls: { speed: false },
  theme: { accent: "#ffd400", radius: "0px" },
  locale
});

const examplePlayer = YellowVSL.create("#example-player", {
  video,
  sticky: { position: "bottom-right", width: "370px" },
  playback: { autoplay: false, resume: "ask" },
  controls: { speed: true },
  hooks: [{ id: "site-hook", start: 2, end: 5.5, text: t("player.hook"), placement: "top-left" }],
  ctas: [{ id: "site-offer", start: 6, text: t("player.cta"), reveal: "#example-offer", placement: "bottom-right", background: "#ffd400", color: "#171400", persist: false }],
  locale
});

const verticalPlayer = YellowVSL.create("#vertical-player", {
  video,
  aspectRatio: "9/16",
  playback: { autoplay: false, resume: false, start: 10, end: 16, loop: true, rate: 1.5 },
  progress: { mode: "real" },
  controls: { speed: true },
  theme: { accent: "#72e5ff", radius: "16px" },
  locale
});

const popupPlayer = YellowVSL.create("#popup-player", {
  video,
  popup: { trigger: "#open-popup" },
  playback: { autoplay: false, resume: false },
  progress: { mode: "hidden" },
  theme: { accent: "#ff7ad9" },
  locale
});

window.yellowVslSite = { heroPlayer, examplePlayer, verticalPlayer, popupPlayer };

document.querySelector("#example-unmute").addEventListener("click", () => examplePlayer.unmute(true));
document.querySelector("#example-forward").addEventListener("click", () => {
  const before = examplePlayer.getState().maxWatched;
  const requested = before + 60;
  const actual = examplePlayer.seek(requested);
  showResult(actual <= before + 0.05, format(t("dynamic.forward"), {
    before: before.toFixed(1),
    requested: requested.toFixed(1),
    actual: actual.toFixed(1)
  }));
});
document.querySelector("#example-back").addEventListener("click", () => {
  const state = examplePlayer.getState();
  if (state.maxWatched < 2) {
    showResult(false, t("dynamic.watchTwo"));
    return;
  }
  const requested = Math.max(0, state.maxWatched - 2);
  const actual = examplePlayer.seek(requested);
  showResult(Math.abs(actual - requested) < 0.1, format(t("dynamic.backward"), { actual: actual.toFixed(1) }));
});
document.querySelector("#vertical-start").addEventListener("click", () => verticalPlayer.play());
for (const button of document.querySelectorAll("[data-copy-target]")) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(document.querySelector(`#${button.dataset.copyTarget}`).textContent);
      button.textContent = t("dynamic.copied");
    } catch {
      button.textContent = t("dynamic.selectCode");
    }
    window.setTimeout(() => { button.textContent = t("install.copy"); }, 1800);
  });
}

document.querySelector("#docs-link").href = i18n.language === "en"
  ? "https://github.com/dvygolov/yellow-vsl/blob/main/README.en.md#configuration-reference"
  : "https://github.com/dvygolov/yellow-vsl#configuration-reference";

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

function format(template, values) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), template);
}
