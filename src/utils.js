export const DEFAULT_PROGRESS_POINTS = Object.freeze([
  Object.freeze([0, 0]),
  Object.freeze([0.1, 0.3]),
  Object.freeze([0.5, 0.75]),
  Object.freeze([1, 1])
]);

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function parseYouTubeId(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (VIDEO_ID_PATTERN.test(input)) return input;

  let url;
  try {
    url = new URL(input.startsWith("//") ? `https:${input}` : input);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  let candidate = null;

  if (hostname === "youtu.be") {
    candidate = url.pathname.split("/").filter(Boolean)[0];
  } else if (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "music.youtube.com" ||
    hostname === "youtube-nocookie.com"
  ) {
    candidate = url.searchParams.get("v");
    if (!candidate) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live", "v"].includes(parts[0])) candidate = parts[1];
    }
  }

  return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

export function validateProgressPoints(points) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new TypeError("progress.points должен содержать не менее двух контрольных точек");
  }

  const normalized = points.map((point) => {
    if (!Array.isArray(point) || point.length !== 2) {
      throw new TypeError("Каждая контрольная точка progress.points должна иметь формат [real, visual]");
    }
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new RangeError("Координаты progress.points должны находиться в диапазоне от 0 до 1");
    }
    return [x, y];
  });

  if (normalized[0][0] !== 0 || normalized[0][1] !== 0) {
    throw new RangeError("Первая контрольная точка progress.points должна быть [0, 0]");
  }
  const last = normalized.at(-1);
  if (last[0] !== 1 || last[1] !== 1) {
    throw new RangeError("Последняя контрольная точка progress.points должна быть [1, 1]");
  }

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    if (current[0] <= previous[0] || current[1] < previous[1]) {
      throw new RangeError("progress.points должны монотонно возрастать по реальной и визуальной шкалам");
    }
  }

  return normalized;
}

export function interpolateProgress(realFraction, points = DEFAULT_PROGRESS_POINTS) {
  const value = clamp(realFraction, 0, 1);
  if (value <= 0) return 0;
  if (value >= 1) return 1;

  for (let index = 1; index < points.length; index += 1) {
    const [rightX, rightY] = points[index];
    if (value <= rightX) {
      const [leftX, leftY] = points[index - 1];
      const local = (value - leftX) / (rightX - leftX);
      return leftY + local * (rightY - leftY);
    }
  }
  return 1;
}

export function invertProgress(visualFraction, points = DEFAULT_PROGRESS_POINTS) {
  const value = clamp(visualFraction, 0, 1);
  if (value <= 0) return 0;
  if (value >= 1) return 1;

  for (let index = 1; index < points.length; index += 1) {
    const [rightX, rightY] = points[index];
    if (value <= rightY) {
      const [leftX, leftY] = points[index - 1];
      if (rightY === leftY) return leftX;
      const local = (value - leftY) / (rightY - leftY);
      return leftX + local * (rightX - leftX);
    }
  }
  return 1;
}

export function toSafeUrl(value, baseUrl) {
  if (!value) return null;
  try {
    const url = new URL(String(value), baseUrl || "https://example.invalid/");
    return ALLOWED_URL_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function parseAspectRatio(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return 16 / 9;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[/:]\s*(\d+(?:\.\d+)?)$/);
  if (!match) return 16 / 9;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? width / height : 16 / 9;
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}
