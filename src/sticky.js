import { YT_STATE } from "./youtube-api.js";

export class StickyController {
  constructor(player) {
    this.player = player;
    this.dismissed = false;
    this.outOfView = false;
  }

  setup() {
    if (!this.player.options.sticky || !globalThis.IntersectionObserver) return;
    this.observer = new IntersectionObserver(([entry]) => {
      this.outOfView = !entry.isIntersecting;
      this.apply();
    }, { threshold: 0 });
    this.observer.observe(this.player.dom.sentinel);

    if (typeof this.player.options.sticky === "object") {
      const position = this.player.options.sticky.position;
      if (position === "bottom-left") {
        this.player.dom.root.style.left = "18px";
        this.player.dom.root.style.right = "auto";
      }
      if (this.player.options.sticky.width) this.player.dom.root.style.setProperty("--yvsl-sticky-width", String(this.player.options.sticky.width));
    }
  }

  apply() {
    const active = Boolean(
      this.player.options.sticky &&
      this.outOfView &&
      !this.dismissed &&
      !this.player.popupOpen &&
      document.fullscreenElement !== this.player.dom.root &&
      this.player.hasStarted &&
      [YT_STATE.PLAYING, YT_STATE.PAUSED, YT_STATE.BUFFERING].includes(this.player.playerState)
    );
    this.player.dom.root.classList.toggle("yvsl-root--sticky", active);
  }

  dismiss() {
    this.dismissed = true;
    this.player.dom.root.classList.remove("yvsl-root--sticky");
    this.player.pause();
  }

}
