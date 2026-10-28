import { TZ } from "./constants";

// IST is a fixed +05:30 offset (no DST), so wall-clock <-> UTC conversion is exact.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Shift a UTC instant so its UTC getters read as IST wall-clock. */
export function toIstParts(d: Date) {
  const s = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth(),
    d: s.getUTCDate(),
    h: s.getUTCHours(),
    min: s.getUTCMinutes(),
    dow: s.getUTCDay(),
  };
}

/** Build a UTC Date from IST wall-clock fields. */
export function fromIst(y: number, m: number, d: number, h = 0, min = 0) {
  return new Date(Date.UTC(y, m, d, h, min) - IST_OFFSET_MS);
}

export function istDateKey(d = new Date()) {
  const p = toIstParts(d);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function startOfIstDay(d = new Date()) {
  const p = toIstParts(d);
  return fromIst(p.y, p.m, p.d);
}
export function endOfIstDay(d = new Date()) {
  return new Date(startOfIstDay(d).getTime() + 24 * 3600 * 1000 - 1);
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(d));
}

export function fmtRelative(d: Date | string | null | undefined) {
  if (!d) return "never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Value for <input type="datetime-local"> in IST. */
export function toIstInputValue(d: Date | string | null | undefined) {
  if (!d) return "";
  const p = toIstParts(new Date(d));
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${z(p.m + 1)}-${z(p.d)}T${z(p.h)}:${z(p.min)}`;
}
/** Parse a datetime-local string, interpreted as IST, into a UTC Date. */
export function fromIstInputValue(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return null;
  return fromIst(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}
