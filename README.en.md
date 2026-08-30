[Русская версия](README.md)

```
                            YellowVSL
    _            __     __  _ _             __          __  _
   | |           \ \   / / | | |            \ \        / / | |
   | |__  _   _   \ \_/ /__| | | _____      _\ \  /\  / /__| |__
   | '_ \| | | |   \   / _ \ | |/ _ \ \ /\ / /\ \/  \/ / _ \ '_ \
   | |_) | |_| |    | |  __/ | | (_) \ V  V /  \  /\  /  __/ |_) |
   |_.__/ \__, |    |_|\___|_|_|\___/ \_/\_/    \/  \/ \___|_.__/
           __/ |
          |___/             https://yellowweb.top

If you like this script, PLEASE DONATE!
```

[Support this project](https://yellowweb.top/donate)

# YellowVSL

A free vanilla JavaScript VSL player backed by YouTube. YellowVSL adds Smart Autoplay, Smart Progress, forward-seek blocking, Continue Watching, timed CTAs, mini-hooks, popup and sticky modes without a separate video host, dashboard or runtime dependencies.

**Live website and examples:** [yellowvsl.pages.dev](https://yellowvsl.pages.dev/?lang=en)

## Quick start

```html
<div
  data-yellow-vsl
  data-video="https://youtu.be/M7lc1UVf-VE">
</div>

<script defer src="https://cdn.jsdelivr.net/gh/dvygolov/yellow-vsl@v1.6.3/dist/yellow-vsl.min.js"></script>
```

The defaults include:

- muted Smart Autoplay with a sound-and-restart prompt;
- Smart Progress using `0% -> 0%`, `10% -> 30%`, `50% -> 75%`, `100% -> 100%`;
- rewind through watched content and blocked forward seeking;
- a Continue Watching prompt on the next visit;
- play/pause, sound, progress and fullscreen controls;
- a custom poster and interaction layer that keeps YouTube hover controls out of the visible stage.

## Local demo

YouTube needs an HTTP page with a valid Referer. Start the bundled demo on Windows with:

```text
demo\start-demo.cmd
```

Or run:

```bash
npm run demo
```

Open `http://127.0.0.1:4173/demo/`. The demo covers Smart Autoplay, Smart Progress, CTAs, hooks, seek rules, resume, popup, sticky, fullscreen, vertical clips, looping, playback rate, multiple instances and client-side events.

[Visual test matrix](evidence/README.md)

## Extended example

```html
<div id="sales-video"></div>

<section id="offer" hidden>
  This block is revealed after the CTA is clicked.
</section>

<script src="https://cdn.jsdelivr.net/gh/dvygolov/yellow-vsl@v1.6.3/dist/yellow-vsl.min.js"></script>
<script>
  const player = YellowVSL.create("#sales-video", {
    video: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    aspectRatio: "16/9",
    playback: {
      autoplay: "smart",
      noSeek: "forward",
      resume: "ask",
      start: 0,
      end: null,
      loop: false,
      rate: 1
    },
    progress: {
      mode: "smart",
      points: [[0, 0], [0.1, 0.3], [0.5, 0.75], [1, 1]]
    },
    controls: {
      play: true,
      volume: true,
      fullscreen: true,
      progress: true,
      speed: false
    },
    hooks: [{
      id: "wait",
      start: 10,
      end: 20,
      text: "Keep watching - the key part is next",
      placement: "top-left"
    }],
    ctas: [{
      id: "offer",
      start: 30,
      text: "Get the offer",
      reveal: "#offer",
      scroll: true,
      placement: "bottom-right",
      background: "#ff3b30",
      color: "#ffffff",
      persist: true
    }],
    sticky: true
  });
</script>
```

All `start`, `end`, CTA, hook and reveal times are relative to the beginning of the displayed clip. Playback rate does not shift those cue points.

## Configuration reference

### Top-level options

| Option | Type / values | Default | Purpose |
| --- | --- | --- | --- |
| `video` | YouTube URL or ID | required | Video to load |
| `playback` | object | see the next table | Autoplay, clip range, loop, speed and seeking |
| `progress` | object | Smart Progress | Progress mode and curve |
| `controls` | object | play, volume, progress, fullscreen | Bottom control bar |
| `stage` | object | custom poster and click layer | Video stage behavior |
| `aspectRatio` | `"16/9"`, `"9/16"` or another ratio | `"16/9"` | Container shape; use a vertical source video for 9:16 |
| `ctas` | array | `[]` | Timed CTA buttons |
| `hooks` | array | `[]` | Timed mini-hook text |
| `reveals` | array | `[]` | Timed automatic page-block reveals |
| `sticky` | boolean or object | `false` | Sticky mini-player |
| `popup` | boolean or object | `false` | Modal player |
| `theme` | object | default dark theme | Colors and geometry |
| `locale` | object | Russian strings | Player labels, resume copy and errors |
| `styleNonce` | string | unset | CSP nonce for the injected style element |

### `playback`

| Option | Values | Default | Purpose |
| --- | --- | --- | --- |
| `autoplay` | `"smart"`, `false` | `"smart"` | Starts muted or waits for a click |
| `noSeek` | `"forward"`, `false` | `"forward"` | Blocks seeking beyond watched time; `false` enables free seeking |
| `resume` | `"ask"`, `"auto"`, `false` | `"ask"` | Prompts, resumes automatically or ignores saved position |
| `start` | seconds | `0` | Start of the displayed clip |
| `end` | seconds, `null` | `null` | End of the clip; `null` plays through the full video |
| `loop` | boolean | `false` | Repeats the video or selected clip |
| `rate` | `0.25`-`2` | `1` | Fixed playback rate |
| `singlePlayback` | boolean | `true` | Pauses other YellowVSL instances when this one starts |

Free seeking with a looping clip:

```js
playback: {
  autoplay: false,
  noSeek: false,
  resume: false,
  start: 10,
  end: 70,
  loop: true,
  rate: 1.25
}
```

### `progress`

| Option | Values | Default | Purpose |
| --- | --- | --- | --- |
| `mode` | `"smart"`, `"real"`, `"hidden"` | `"smart"` | Smart curve, real progress or no bar |
| `points` | `[real, visual]` pairs | `[[0,0],[0.1,0.3],[0.5,0.75],[1,1]]` | Custom monotonic Smart Progress curve |

Points accept two formats: `0..1` fractions or regular `0..100` percentages. Use one scale throughout a matrix. The first point must be `[0, 0]`; the last must be `[1, 1]` or `[100, 100]`.

```js
progress: {
  mode: "smart",
  points: [
    [0, 0],
    [5, 50],
    [30, 70],
    [50, 90],
    [100, 100]
  ]
}
```

This curve shows 50% after 5% of real watch time, 70% after 30%, and 90% after 50%. Values between control points are linearly interpolated.

### `controls`

All control values are boolean.

| Option | Default | Element |
| --- | --- | --- |
| `play` | `true` | Play / pause |
| `volume` | `true` | Sound |
| `fullscreen` | `true` | Fullscreen |
| `progress` | `true` | Progress bar |
| `speed` | `false` | Playback-rate selector |

### `stage`

| Option | Values | Default | Purpose |
| --- | --- | --- | --- |
| `poster` | `"auto"`, URL, `false` | `"auto"` | YouTube thumbnail, custom image or no poster |
| `clickToToggle` | boolean | `true` | Toggles play/pause when the stage is clicked |
| `revealDelay` | milliseconds | `0` | Keeps the poster visible briefly after playback starts |

### Timed CTAs

```js
ctas: [{
  id: "offer",
  start: 45,
  end: 90,
  text: "Get the offer",
  reveal: "#offer",
  scroll: true,
  placement: "bottom-right",
  background: "#ff3b30",
  color: "#ffffff",
  persist: true,
  autoScroll: false
}]
```

| Option | Purpose |
| --- | --- |
| `id` | Stable CTA ID used by events and saved unlocks |
| `start`, `end` | Show/hide time relative to the clip start; omit `end` to keep the CTA visible |
| `text` | Button text |
| `url` | Destination URL; omit it for a CTA that reveals a page block |
| `target` | `_self` or `_blank` |
| `placement` | `above`, `below`, `top-left`, `top-right`, `bottom-left`, `bottom-right` |
| `background` | CTA background color: hex, rgb, hsl, CSS variable or color name |
| `color` | CTA text color |
| `reveal` | CSS selector for the page block to reveal after the CTA is clicked |
| `persist` | Stores the unlocked offer in `localStorage`; `false` limits it to the active interval |
| `scroll` | Smoothly scrolls to the revealed block after the click; defaults to `true` |
| `autoScroll` | Scrolls the CTA into view when it appears |

Use `url` and optionally `target` for a link CTA. Use `reveal` for a CTA that opens a hidden page block. Merely showing the CTA does not reveal the block.

### Automatic page-block reveals

`reveals` opens a block at a chosen time without a CTA or click:

```js
reveals: [{
  id: "auto-order-form",
  start: 90,
  selector: "#order-form",
  persist: true,
  scroll: false
}]
```

| Option | Purpose |
| --- | --- |
| `id` | Stable ID used for saved reveal state |
| `start`, `end` | Reveal time and, with `persist: false`, hide time |
| `selector` | CSS selector for the page block to reveal |
| `persist` | Saves the revealed state in `localStorage`; defaults to `true` |
| `scroll` | Scrolls to the block when it is revealed; defaults to `false` |

### Mini-hooks

A mini-hook is an optional timed text prompt. It does not open anything or navigate anywhere. Use it for a short teaser, reminder or explanation. Hooks support `id`, `start`, `end`, `text` and the same six `placement` values:

```js
hooks: [{
  id: "deadline",
  start: 20,
  end: 28,
  text: "Keep watching - offer terms are next",
  placement: "top-left"
}]
```

### `sticky` and `popup`

```js
sticky: {
  position: "bottom-right", // bottom-left is also supported
  width: "420px"
}

popup: {
  trigger: "#open-video",
  preload: true
}
```

`sticky: true` uses the bottom-right corner and default width. Pausing keeps the sticky player in place so playback can resume there. The close button dismisses it and pauses the video. `popup.trigger` accepts a CSS selector for one or more external buttons. `popup.preload: true` loads YouTube in advance so the dialog opens immediately. Without `preload`, the iframe is created on first open.

Fullscreen controls hide automatically after 2.4 seconds of playback. Tapping the video reveals them without pausing; controls remain visible while playback is paused.

### `theme`

| Option | CSS variable |
| --- | --- |
| `accent` | `--yvsl-accent` |
| `background` | `--yvsl-bg` |
| `panel` | `--yvsl-panel` |
| `text` | `--yvsl-text` |
| `muted` | `--yvsl-muted` |
| `radius` | `--yvsl-radius` |
| `shadow` | `--yvsl-shadow` |

Overridable `locale` strings: `play`, `pause`, `mute`, `unmute`, `unmutePrompt`, `fullscreen`, `exitFullscreen`, `progress`, `continueTitle`, `continue`, `restart`, `autoplayBlocked`, `loading`, `close`, `speed`, `genericError`, `identityError`, `embedError`, `unavailableError`.

## Declarative attributes

| Attribute | Example | Purpose |
| --- | --- | --- |
| `data-video` | URL or ID | Required video |
| `data-autoplay` | `false` | Disable Smart Autoplay |
| `data-progress` | `smart`, `real`, `hidden` | Progress mode |
| `data-resume` | `ask`, `auto`, `false` | Resume mode |
| `data-start`, `data-end` | seconds | Video clip |
| `data-rate` | `1.2` | Playback rate |
| `data-loop` | `true` | Loop the clip |
| `data-no-seek` | `false` | Enable free seeking |
| `data-aspect-ratio` | `9/16` | Player shape |
| `data-sticky` | `true` | Enable sticky mode |
| `data-popup-trigger` | `#open-video` | Popup trigger selector |
| `data-reveal-delay` | `200` | Poster reveal delay in milliseconds |

## API

```js
const player = YellowVSL.create(target, options);

await player.ready;
player.play();
player.pause();
player.mute();
player.unmute(true); // enable sound and seek to the beginning; play/pause stays unchanged
player.seek(20);     // forward seek is limited by maxWatched
player.open();
player.close();
player.getState();
player.destroy();
```

`YellowVSL.autoInit()` scans the page again and returns instances for every `data-yellow-vsl` element.

## Events

YellowVSL sends no analytics requests. Events bubble from the player root:

```js
document.addEventListener("yellowvsl:cta-click", (event) => {
  console.log(event.detail.videoId, event.detail.cta);
});
```

Available events: `yellowvsl:ready`, `view`, `play`, `pause`, `progress`, `resume`, `complete`, `cta-show`, `cta-click`, `error`.

## Development

```bash
npm install
npm run build
npm run build:site
npm run test:unit
npm run test:browser
npm run test:live
```

`npm test` builds the project and runs unit plus deterministic browser tests in Chromium, Firefox and WebKit. `npm run test:live` uses the real YouTube IFrame Player API.

The `site/` directory contains the public website source. `npm run build:site` creates `site-dist/`. Every push to `main` is deployed to Cloudflare Pages by `.github/workflows/pages.yml`.

Download stable files from [GitHub Releases](https://github.com/dvygolov/yellow-vsl/releases), or use `dist/yellow-vsl.min.js` from a versioned tag.

## License

[MIT](LICENSE)
