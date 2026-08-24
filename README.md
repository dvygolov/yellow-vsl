# YellowVSL

Бесплатный VSL-плеер для YouTube на чистом JavaScript. YellowVSL добавляет Smart Autoplay, Smart Progress, запрет перехода вперёд, продолжение просмотра, CTA, mini-hooks, popup и sticky-режим — без собственного видеохостинга, backend и runtime-зависимостей.

**Сайт с живыми примерами:** [yellowvsl.pages.dev](https://yellowvsl.pages.dev/)

## Быстрый старт

```html
<div
  data-yellow-vsl
  data-video="https://youtu.be/M7lc1UVf-VE">
</div>

<script defer src="https://cdn.jsdelivr.net/gh/dvygolov/yellow-vsl@v1.2.0/dist/yellow-vsl.min.js"></script>
```

По умолчанию включены:

- Smart Autoplay без звука с предложением включить звук и начать сначала;
- Smart Progress с кривой `0% → 0%`, `10% → 30%`, `50% → 75%`, `100% → 100%`;
- возврат в уже просмотренную часть и блокировка перехода вперёд;
- предложение продолжить просмотр при следующем посещении;
- play/pause, звук и fullscreen во внешней панели.
- собственная обложка и интерактивный слой: наведение не вызывает штатные кнопки YouTube поверх кадра.

## Рабочее локальное демо

YouTube не разрешает надёжно запускать IFrame Player API со страницы, открытой как `file://`: в таком режиме может появиться Error 153 из-за отсутствия HTTP Referer. Поэтому не открывайте `demo/index.html` двойным щелчком.

В Windows запустите:

```text
demo\start-demo.cmd
```

Или из терминала в каталоге проекта:

```bash
npm run demo
```

Команда поднимет локальный HTTP-сервер и откроет `http://127.0.0.1:4173/demo/`. Стенд содержит реальные интерактивные проверки Smart Autoplay, Smart Progress, CTA, hooks, перемотки, resume, popup, sticky, fullscreen, вертикального фрагмента, loop, скорости, нескольких плееров и клиентских событий.

[Матрица проверок и визуальные доказательства](evidence/README.md)

## Расширенная настройка

```html
<div id="sales-video"></div>

<section id="offer" hidden>
  Этот блок откроется после просмотра питча.
</section>

<script src="https://cdn.jsdelivr.net/gh/dvygolov/yellow-vsl@v1.2.0/dist/yellow-vsl.min.js"></script>
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
    hooks: [
      { id: "wait", start: 10, end: 20, text: "Досмотрите — дальше самое важное", placement: "above" }
    ],
    ctas: [
      {
        id: "offer",
        start: 30,
        text: "Перейти к предложению",
        url: "https://example.com/checkout",
        target: "_blank",
        reveal: "#offer",
        placement: "bottom-right",
        persist: true
      }
    ],
    sticky: true
  });
</script>
```

Все значения `start`, `end`, время CTA и hooks считаются относительно начала показываемого фрагмента. Изменение скорости воспроизведения не меняет медиавремя этих событий.

CTA и hooks можно размещать снаружи кадра (`above`, `below`) или поверх видео: `top-left`, `top-right`, `bottom-left`, `bottom-right`.

```js
ctas: [{
  start: 30,
  text: "Открыть предложение",
  placement: "bottom-right"
}]
```

## Декларативные атрибуты

Для простой установки доступны:

| Атрибут | Пример | Назначение |
| --- | --- | --- |
| `data-video` | URL или ID | Обязательное видео |
| `data-autoplay` | `false` | Отключить Smart Autoplay |
| `data-progress` | `smart`, `real`, `hidden` | Режим прогресса |
| `data-resume` | `ask`, `auto`, `false` | Возврат к просмотру |
| `data-start`, `data-end` | секунды | Фрагмент видео |
| `data-rate` | `1.2` | Скорость воспроизведения |
| `data-loop` | `true` | Повторять фрагмент |
| `data-no-seek` | `false` | Разрешить переход по всей шкале |
| `data-aspect-ratio` | `9/16` | Соотношение сторон |
| `data-sticky` | `true` | Закреплять при прокрутке |
| `data-popup-trigger` | `#open-video` | Открывать в popup по селектору |

## API

```js
const player = YellowVSL.create(target, options);

await player.ready;
player.play();
player.pause();
player.mute();
player.unmute(true); // true — начать сначала
player.seek(20);     // переход вперёд будет ограничен maxWatched
player.open();
player.close();
player.getState();
player.destroy();
```

`YellowVSL.autoInit()` повторно сканирует страницу и возвращает экземпляры всех элементов `data-yellow-vsl`.

## События

YellowVSL не отправляет аналитику самостоятельно. События всплывают от корневого элемента и могут обрабатываться на `document`:

```js
document.addEventListener("yellowvsl:cta-click", (event) => {
  console.log(event.detail.videoId, event.detail.cta);
});
```

Доступны `yellowvsl:ready`, `view`, `play`, `pause`, `progress`, `resume`, `complete`, `cta-show`, `cta-click`, `error`.

## Popup и sticky

```js
const popup = YellowVSL.create("#popup-video", {
  video: "M7lc1UVf-VE",
  popup: { trigger: "#open-video" }
});

const sticky = YellowVSL.create("#sticky-video", {
  video: "M7lc1UVf-VE",
  sticky: { position: "bottom-right", width: "420px" }
});
```

Закрытие popup или sticky-плеера ставит видео на паузу. Скрытое фоновое воспроизведение не используется.
YouTube-плеер внутри popup создаётся при первом открытии, поэтому запуск через внешнюю кнопку работает без промежуточного штатного интерфейса YouTube.

## Оформление

Цвета можно задавать через `theme` или CSS-переменные:

```js
theme: {
  accent: "#ffd400",
  background: "#111214",
  panel: "#1b1d21",
  text: "#ffffff",
  muted: "#a7abb4",
  radius: "14px"
}
```

## Разработка

```bash
npm install
npm run build
npm run build:site
npm run test:unit
npm run test:browser
npm run test:live
```

`npm test` собирает проект и запускает unit-тесты и детерминированные браузерные тесты в Chromium, Firefox и WebKit. Live smoke-test вынесен отдельно, поскольку зависит от доступности YouTube.

Каталог `site/` содержит исходники публичного лендинга, а `npm run build:site` создаёт готовый к публикации `site-dist/`. Workflow `.github/workflows/pages.yml` после каждого push в `main` публикует проверенную сборку на Cloudflare Pages.

Для прямого скачивания используйте файлы из [GitHub Releases](https://github.com/dvygolov/yellow-vsl/releases) или `dist/yellow-vsl.min.js` из нужного версионного тега. Для продакшена фиксируйте версию в CDN-адресе, а не подключайте ветку `main`.

## Лицензия

[MIT](LICENSE)
