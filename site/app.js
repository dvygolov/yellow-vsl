const video = "https://www.youtube.com/watch?v=Y7jHPB7FjhM";
const i18n = window.YellowVslSiteI18n;
i18n.apply();
const t = i18n.text;
const locale = i18n.playerLocale;
const captions = { enabled: false, language: i18n.language };

const heroPlayer = YellowVSL.create("#hero-player", {
  video,
  playback: { autoplay: "smart", resume: false },
  progress: { mode: "smart" },
  controls: { speed: false },
  captions,
  theme: { accent: "#ffd400", radius: "0px" },
  locale
});

const examplePlayer = YellowVSL.create("#example-player", {
  video,
  sticky: { position: "bottom-right", width: "370px" },
  playback: { autoplay: false, resume: "ask" },
  controls: { speed: true },
  captions,
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
  captions,
  theme: { accent: "#72e5ff", radius: "16px" },
  locale
});

const fastProgressPlayer = YellowVSL.create("#fast-progress-player", {
  video,
  playback: { autoplay: false, resume: false },
  progress: {
    mode: "smart",
    points: [[0, 0], [0.001, 0.5], [0.1, 0.58], [0.5, 0.8], [1, 1]]
  },
  controls: { speed: false },
  captions,
  theme: { accent: "#72e5ff", radius: "0px" },
  locale
});

const externalCtaPlayer = YellowVSL.create("#external-cta-player", {
  video,
  playback: { autoplay: false, resume: false },
  controls: { speed: false },
  captions,
  ctas: [{
    id: "yellowweb-link",
    start: 3,
    text: t("player.yellowwebCta"),
    url: "https://yellowweb.top",
    target: "_blank",
    placement: "bottom-right",
    background: "#ffd400",
    color: "#171400",
    persist: false
  }],
  theme: { accent: "#ffd400", radius: "0px" },
  locale
});

const popupPlayer = YellowVSL.create("#popup-player", {
  video,
  popup: { trigger: "#open-popup", preload: true },
  playback: { autoplay: false, resume: false },
  captions,
  theme: { accent: "#ff7ad9" },
  locale
});

window.yellowVslSite = { heroPlayer, examplePlayer, fragmentPlayer, fastProgressPlayer, externalCtaPlayer, popupPlayer };

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

Promise.allSettled([heroPlayer.ready, examplePlayer.ready, fragmentPlayer.ready, fastProgressPlayer.ready, externalCtaPlayer.ready, popupPlayer.ready]).then(() => {
  document.documentElement.dataset.playersReady = "true";
});
