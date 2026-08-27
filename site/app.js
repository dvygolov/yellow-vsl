const video = "https://www.youtube.com/watch?v=Y7jHPB7FjhM";
const i18n = window.YellowVslSiteI18n;
i18n.apply();
const t = i18n.text;
const locale = i18n.playerLocale;

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
  theme: { radius: "0px" },
  hooks: [{ id: "site-hook", start: 2, end: 5.5, text: t("player.hook"), placement: "top-left" }],
  ctas: [{ id: "site-offer", start: 6, text: t("player.cta"), reveal: "#example-offer", placement: "bottom-right", background: "#ffd400", color: "#171400", persist: false }],
  locale
});

const fragmentPlayer = YellowVSL.create("#fragment-player", {
  video,
  aspectRatio: "16/9",
  playback: { autoplay: false, resume: false, start: 10, end: 16, loop: true, rate: 1.5 },
  progress: { mode: "real" },
  controls: { speed: true },
  theme: { accent: "#72e5ff", radius: "16px" },
  locale
});

const popupPlayer = YellowVSL.create("#popup-player", {
  video,
  popup: { trigger: "#open-popup", preload: true },
  playback: { autoplay: false, resume: false },
  progress: { mode: "hidden" },
  theme: { accent: "#ff7ad9" },
  locale
});

window.yellowVslSite = { heroPlayer, examplePlayer, fragmentPlayer, popupPlayer };

document.querySelector("#example-unmute").addEventListener("click", (event) => {
  examplePlayer.unmute(true);
  event.currentTarget.hidden = true;
}, { once: true });
document.querySelector("#fragment-start").addEventListener("click", () => fragmentPlayer.play());
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

Promise.allSettled([heroPlayer.ready, examplePlayer.ready, fragmentPlayer.ready, popupPlayer.ready]).then(() => {
  document.documentElement.dataset.playersReady = "true";
});
