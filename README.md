[English version](README.en.md)

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

[Поддержать проект](https://yellowweb.top/donate)

# YellowVSL

Бесплатный VSL-плеер для YouTube на чистом JavaScript. YellowVSL добавляет Smart Autoplay, Smart Progress, запрет перехода вперёд, продолжение просмотра, CTA, mini-hooks, popup и sticky-режим — без собственного видеохостинга, backend и runtime-зависимостей.

**Сайт с живыми примерами:** [yellowvsl.pages.dev](https://yellowvsl.pages.dev/)

## Быстрый старт

```html
<div
  data-yellow-vsl
  data-video="https://youtu.be/M7lc1UVf-VE">
</div>

<script defer src="https://cdn.jsdelivr.net/gh/dvygolov/yellow-vsl@v1.7.3/dist/yellow-vsl.min.js"></script>
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
  Этот блок откроется после клика по CTA.
</section>

<script src="https://cdn.jsdelivr.net/gh/dvygolov/yellow-vsl@v1.7.3/dist/yellow-vsl.min.js"></script>
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
      captions: true,
      speed: false
    },
    captions: {
      enabled: "auto",
      language: "ru"
    },
    youtubeUi: "clean",
    hooks: [
      { id: "wait", start: 10, end: 20, text: "Досмотрите: дальше самое важное", placement: "above" }
    ],
    ctas: [
      {
        id: "offer",
        start: 30,
        text: "Открыть предложение",
        reveal: "#offer",
        scroll: true,
        placement: "bottom-right",
        persist: true
      }
    ],
    sticky: true
  });
</script>
```

Все значения `start`, `end`, время CTA, hooks и reveals считаются относительно начала показываемого фрагмента. Изменение скорости воспроизведения не меняет секунду, на которой появляются эти элементы.

CTA и hooks можно размещать снаружи кадра (`above`, `below`) или поверх видео: `top-left`, `top-right`, `bottom-left`, `bottom-right`.

```js
ctas: [{
  start: 30,
  text: "Открыть предложение",
  url: "https://example.com/checkout",
  placement: "bottom-right",
  background: "#ff3b30",
  color: "#ffffff"
}]
```

## Configuration reference

### Основные параметры

| Параметр | Тип / значения | По умолчанию | Что делает |
| --- | --- | --- | --- |
| `video` | YouTube URL или ID | обязательно | Видео для плеера |
| `playback` | object | см. таблицу дальше | Воспроизведение, фрагмент, loop и перемотка |
| `progress` | object | Smart Progress | Вид и кривая шкалы |
| `controls` | object | play, volume, captions, progress, fullscreen | Кнопки нижней панели |
| `captions` | object | `enabled: "auto"`, `language: null` | Начальное состояние и язык родных субтитров YouTube |
| `youtubeUi` | `"clean"`, `"native"` | `"clean"` | Чистый кадр без служебных элементов YouTube или обычная геометрия iframe |
| `stage` | object | собственная обложка и клики | Поведение области видео |
| `aspectRatio` | `"16/9"`, `"9/16"` или другое отношение | `"16/9"` | Формат контейнера; для 9:16 используйте вертикальное исходное видео |
| `ctas` | array | `[]` | Кнопки по таймеру |
| `hooks` | array | `[]` | Текстовые mini-hooks по таймеру |
| `reveals` | array | `[]` | Автоматическое раскрытие блоков страницы по таймеру |
| `sticky` | boolean или object | `false` | Закреплённый mini-player |
| `popup` | boolean или object | `false` | Плеер в модальном окне |
| `theme` | object | стандартная тёмная тема | Цвета и геометрия |
| `locale` | object | русские строки | Тексты кнопок, resume и ошибок |
| `styleNonce` | string | отсутствует | CSP nonce для встроенного стиля |

### `playback`

| Параметр | Значения | По умолчанию | Что делает |
| --- | --- | --- | --- |
| `autoplay` | `"smart"`, `false` | `"smart"` | Запускает видео без звука или ждёт клика |
| `noSeek` | `"forward"`, `false` | `"forward"` | Блокирует переход дальше реально просмотренного времени; `false` разрешает свободную перемотку |
| `resume` | `"ask"`, `"auto"`, `false` | `"ask"` | Предлагает продолжить, продолжает автоматически или отключает сохранённую позицию |
| `start` | секунды | `0` | Начало показываемого фрагмента |
| `end` | секунды, `null` | `null` | Конец фрагмента; `null` воспроизводит видео до конца |
| `loop` | boolean | `false` | Повторяет видео или заданный фрагмент |
| `rate` | `0.25`-`2` | `1` | Фиксированная скорость воспроизведения |
| `singlePlayback` | boolean | `true` | Ставит другие экземпляры YellowVSL на паузу |

Пример свободной перемотки и loop:

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

| Параметр | Значения | По умолчанию | Что делает |
| --- | --- | --- | --- |
| `mode` | `"smart"`, `"real"`, `"hidden"` | `"smart"` | Выбирает Smart Progress, реальную шкалу или скрывает её |
| `points` | массив `[real, visual]` | `[[0,0],[0.1,0.3],[0.5,0.75],[1,1]]` | Задаёт собственную монотонную кривую Smart Progress |

Точки принимаются в двух форматах: дроби `0..1` и обычные проценты `0..100`. Все точки одной матрицы должны использовать одну шкалу. Первая точка - `[0, 0]`, последняя - `[1, 1]` либо `[100, 100]`.

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

В этой матрице после 5% реального просмотра шкала покажет 50%, после 30% - 70%, после 50% - 90%. Между контрольными точками значение рассчитывается линейно.

### `controls`

Все значения boolean.

| Параметр | По умолчанию | Элемент |
| --- | --- | --- |
| `play` | `true` | Play / pause |
| `volume` | `true` | Звук |
| `fullscreen` | `true` | Полноэкранный режим |
| `progress` | `true` | Шкала просмотра |
| `captions` | `true` | Кнопка CC; автоматически скрывается, если YouTube не вернул дорожки |
| `speed` | `false` | Выбор скорости |

### `captions`

| Параметр | Значения | По умолчанию | Что делает |
| --- | --- | --- | --- |
| `enabled` | `"auto"`, `true`, `false` | `"auto"` | Сохраняет выбор YouTube, включает или выключает субтитры после загрузки дорожек |
| `language` | код языка, `null` | `null` | Предпочтительный язык, например `"ru"` или `"en"`; если его нет, выбирается первая дорожка |

Видимость кнопки и состояние субтитров независимы. Например, русские субтитры можно включить без возможности отключить их через панель:

```js
controls: { captions: false },
captions: {
  enabled: true,
  language: "ru"
}
```

Кнопка CC появляется только после того, как YouTube сообщил о доступных дорожках. Она не запускает, не останавливает и не перематывает видео.

При `youtubeUi: "clean"` плеер использует чистый кадр, пока субтитры выключены. Включение CC автоматически возвращает iframe к обычной геометрии, чтобы родные субтитры YouTube были видны. После выключения CC чистый режим включается снова. Значение `"native"` отключает это переключение.

### `stage`

| Параметр | Значения | По умолчанию | Что делает |
| --- | --- | --- | --- |
| `poster` | `"auto"`, URL, `false` | `"auto"` | Берёт YouTube thumbnail, использует свою картинку или отключает обложку |
| `clickToToggle` | boolean | `true` | Play / pause по клику на кадр |
| `revealDelay` | миллисекунды | `0` | Оставляет обложку видимой заданное время после запуска |

### CTA

```js
ctas: [{
  id: "offer",
  start: 45,
  end: 90,
  text: "Получить предложение",
  reveal: "#offer",
  scroll: true,
  placement: "bottom-right",
  background: "#ff3b30",
  color: "#ffffff",
  persist: true,
  autoScroll: false
}]
```

| Параметр | Что делает |
| --- | --- |
| `id` | Стабильный ID CTA для событий и сохранения |
| `start`, `end` | Время появления и скрытия относительно начала фрагмента; без `end` CTA остаётся до конца |
| `text` | Текст кнопки |
| `url` | Ссылка, которую откроет кнопка; для CTA с раскрытием блока параметр не нужен |
| `target` | `_self` или `_blank` |
| `placement` | `above`, `below`, `top-left`, `top-right`, `bottom-left`, `bottom-right` |
| `background` | Цвет фона CTA: hex, rgb, hsl, CSS variable или имя цвета |
| `color` | Цвет текста CTA |
| `reveal` | CSS-селектор элемента страницы, который откроется после клика по CTA |
| `persist` | Сохраняет открытый оффер в `localStorage`; `false` показывает его только в заданном интервале |
| `scroll` | После клика плавно прокручивает страницу к раскрытому блоку; по умолчанию `true` |
| `autoScroll` | После появления CTA прокручивает страницу к нему |

Для обычной кнопки-ссылки задайте `url` и при необходимости `target`. Для кнопки, которая открывает скрытый блок страницы, задайте `reveal`. Появление CTA само по себе блок не раскрывает.

### Автоматическое раскрытие блока

`reveals` открывает блок по времени без CTA и без клика:

```js
reveals: [{
  id: "auto-order-form",
  start: 90,
  selector: "#order-form",
  persist: true,
  scroll: false
}]
```

| Параметр | Что делает |
| --- | --- |
| `id` | Стабильный ID для сохранения открытого состояния |
| `start`, `end` | Время раскрытия и, при `persist: false`, скрытия блока |
| `selector` | CSS-селектор раскрываемого блока |
| `persist` | Сохраняет открытое состояние в `localStorage`; по умолчанию `true` |
| `scroll` | Прокручивает страницу к блоку при автоматическом раскрытии; по умолчанию `false` |

### Mini-hooks

Mini-hook - необязательная текстовая подсказка по таймеру. Она ничего не открывает и никуда не ведёт. Её можно использовать для короткого анонса оффера, напоминания или пояснения. Hooks используют `id`, `start`, `end`, `text` и те же шесть вариантов `placement`:

```js
hooks: [{
  id: "deadline",
  start: 20,
  end: 28,
  text: "Досмотрите: дальше условия оффера",
  placement: "top-left"
}]
```

### `sticky` и `popup`

```js
sticky: {
  position: "bottom-right", // также bottom-left
  width: "420px"
}

popup: {
  trigger: "#open-video",
  preload: true
}
```

`sticky: true` включает правый нижний угол со стандартной шириной. После паузы sticky-плеер остаётся в углу, поэтому просмотр можно продолжить там же. Крестик закрывает его и ставит видео на паузу. `popup.trigger` принимает CSS-селектор одной или нескольких внешних кнопок. `popup.preload: true` загружает YouTube заранее, чтобы окно открывалось сразу. Без `preload` iframe создаётся только при первом открытии.

### `theme`

| Параметр | CSS-переменная |
| --- | --- |
| `accent` | `--yvsl-accent` |
| `background` | `--yvsl-bg` |
| `panel` | `--yvsl-panel` |
| `text` | `--yvsl-text` |
| `muted` | `--yvsl-muted` |
| `radius` | `--yvsl-radius` |
| `shadow` | `--yvsl-shadow` |

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
| `data-captions` | `auto`, `true`, `false` | Начальное состояние субтитров |
| `data-captions-language` | `ru` | Предпочтительный язык субтитров |
| `data-youtube-ui` | `clean`, `native` | Режим отображения YouTube iframe |
| `data-reveal-delay` | `200` | Задержать скрытие собственной обложки на указанное число миллисекунд |

## API

```js
const player = YellowVSL.create(target, options);

await player.ready;
player.play();
player.pause();
player.mute();
player.unmute(true); // включить звук и вернуть позицию к началу; play/pause не меняется
player.enableCaptions("ru");
player.disableCaptions();
player.toggleCaptions();
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

Доступны `yellowvsl:ready`, `view`, `play`, `pause`, `progress`, `resume`, `complete`, `cta-show`, `cta-click`, `captions`, `error`.

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

В полноэкранном режиме панель управления автоматически скрывается через 2,4 секунды воспроизведения. Тап по видео возвращает панель без паузы; после остановки видео controls остаются видимыми.

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

Переопределяемые строки `locale`: `play`, `pause`, `mute`, `unmute`, `unmutePrompt`, `captionsEnable`, `captionsDisable`, `fullscreen`, `exitFullscreen`, `progress`, `continueTitle`, `continue`, `restart`, `autoplayBlocked`, `loading`, `close`, `speed`, `genericError`, `identityError`, `embedError`, `unavailableError`.

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
