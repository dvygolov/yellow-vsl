export type Placement = "above" | "below" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type ProgressPoint = readonly [number, number];
export interface PlaybackOptions {
  autoplay?: "smart" | false;
  noSeek?: "forward" | false;
  resume?: "ask" | "auto" | false;
  start?: number;
  end?: number | null;
  loop?: boolean;
  rate?: number;
  singlePlayback?: boolean;
}
export interface TimedItem { id?: string; start?: number; end?: number; placement?: Placement; }
export interface CTA extends TimedItem {
  text?: string; url?: string; target?: "_self" | "_blank";
  reveal?: string; persist?: boolean; scroll?: boolean; autoScroll?: boolean;
  background?: string; color?: string;
}
export interface Reveal extends TimedItem { selector: string; persist?: boolean; scroll?: boolean; }
export interface Hook extends TimedItem { text: string; }
export interface PlayerOptions {
  video: string;
  /** Unique instance identity within the page. Defaults to the container's id. */
  storageKey?: string;
  playback?: PlaybackOptions;
  progress?: { mode?: "smart" | "real" | "hidden"; points?: readonly ProgressPoint[] };
  controls?: Partial<Record<"play" | "volume" | "fullscreen" | "progress" | "captions" | "speed", boolean>>;
  captions?: { enabled?: "auto" | boolean; language?: string | null };
  youtubeUi?: "clean" | "native";
  stage?: { poster?: string | false; clickToToggle?: boolean; revealDelay?: number };
  aspectRatio?: string | number;
  sticky?: boolean | { position?: "bottom-left" | "bottom-right"; width?: string };
  popup?: boolean | { trigger?: string; preload?: boolean };
  ctas?: CTA[]; hooks?: Hook[]; reveals?: Reveal[];
  theme?: Partial<Record<"accent" | "background" | "panel" | "text" | "muted" | "radius" | "shadow", string>>;
  locale?: Partial<Record<"play" | "pause" | "mute" | "unmute" | "unmutePrompt" | "fullscreen" | "exitFullscreen" | "progress" | "continueTitle" | "continue" | "restart" | "autoplayBlocked" | "loading" | "captionsEnable" | "captionsDisable" | "close" | "speed" | "genericError" | "identityError" | "embedError" | "unavailableError", string>>;
  styleNonce?: string;
}
export interface PlayerState {
  id: string; videoId: string; ready: boolean;
  playerState: -1 | 0 | 1 | 2 | 3 | 5;
  currentTime: number; duration: number; maxWatched: number;
  muted: boolean; captions: boolean; captionLanguage: string | null;
  rate: number; popupOpen: boolean; sticky: boolean;
}
export interface PlayerEventDetail {
  instance: YellowVSLPlayer; videoId: string; currentTime: number;
  duration: number; maxWatched: number;
}
export class YellowVSLPlayer {
  constructor(target: string | Element, options: PlayerOptions);
  /** A lazy popup resolves its initial ready without mounting; open() starts actual loading. */
  ready: Promise<this>;
  readonly id: string;
  readonly videoId: string;
  readonly destroyed: boolean;
  readonly options: PlayerOptions;
  play(): this;
  pause(): this;
  mute(): this;
  unmute(restart?: boolean): this;
  enableCaptions(language?: string | null): this;
  disableCaptions(): this;
  toggleCaptions(): this;
  /** Seconds relative to the configured fragment. Forward-seek restrictions apply. */
  seek(seconds: number): number;
  open(): this;
  close(): this;
  getState(): PlayerState;
  destroy(): void;
}
export const version: string;
export function create(target: string | Element, options: PlayerOptions): YellowVSLPlayer;
export function autoInit(root?: Document | Element): YellowVSLPlayer[];
export const DEFAULT_PROGRESS_POINTS: readonly ProgressPoint[];
export function parseYouTubeId(value: unknown): string | null;
export function formatTime(seconds: number): string;
export function interpolateProgress(realFraction: number, points?: readonly ProgressPoint[]): number;
export function invertProgress(visualFraction: number, points?: readonly ProgressPoint[]): number;
export function validateProgressPoints(points: readonly ProgressPoint[]): [number, number][];
export function normalizeOptions(options?: Partial<PlayerOptions>): Omit<PlayerOptions, "video"> & {
  video: string | undefined; playback: Required<PlaybackOptions>; aspectRatioValue: number;
};

declare global {
  interface Window { YellowVSL: typeof import("./index.js"); }
  interface DocumentEventMap {
    "yellowvsl:ready": CustomEvent<PlayerEventDetail>;
    "yellowvsl:view": CustomEvent<PlayerEventDetail>;
    "yellowvsl:play": CustomEvent<PlayerEventDetail>;
    "yellowvsl:pause": CustomEvent<PlayerEventDetail>;
    "yellowvsl:progress": CustomEvent<PlayerEventDetail>;
    "yellowvsl:complete": CustomEvent<PlayerEventDetail>;
    "yellowvsl:resume": CustomEvent<PlayerEventDetail & { action: "continue" | "restart"; position: number }>;
    "yellowvsl:cta-show": CustomEvent<PlayerEventDetail & { cta: string }>;
    "yellowvsl:cta-click": CustomEvent<PlayerEventDetail & { cta: string; url: string | null }>;
    "yellowvsl:captions": CustomEvent<PlayerEventDetail & { enabled: boolean; language: string | null }>;
    "yellowvsl:error": CustomEvent<Partial<PlayerEventDetail> & { code: string | number; message: string }>;
  }
}
