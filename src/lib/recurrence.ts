import { fromIst, toIstParts } from "./time";

/**
 * Recurrence rules are stored as a small, readable string (RecurringRule.rrule):
 *   DAILY;AT=09:00
 *   WEEKDAYS;AT=09:30
 *   WEEKLY;BYDAY=TU,SA;AT=10:00
 *   MONTHLY;BYMONTHDAY=1;AT=09:00      (day 29-31 falls back to the month's last day)
 * All times are IST wall-clock; occurrences are returned as UTC instants.
 */
export type Freq = "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY";
export type RuleSpec = { freq: Freq; days: number[]; monthDay: number; hour: number; minute: number };

export const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildRRule(s: { freq: Freq; days?: number[]; monthDay?: number; time: string }) {
  const parts: string[] = [s.freq];
  if (s.freq === "WEEKLY") parts.push(`BYDAY=${[...(s.days ?? [])].sort().map((d) => DAY_CODES[d]).join(",")}`);
  if (s.freq === "MONTHLY") parts.push(`BYMONTHDAY=${s.monthDay ?? 1}`);
  parts.push(`AT=${s.time}`);
  return parts.join(";");
}

export function parseRRule(str: string): RuleSpec | null {
  const [freq, ...rest] = str.split(";");
  if (!["DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY"].includes(freq)) return null;
  const kv = Object.fromEntries(rest.map((p) => p.split("=") as [string, string]));
  const at = /^(\d{1,2}):(\d{2})$/.exec(kv.AT ?? "");
  if (!at || +at[1] > 23 || +at[2] > 59) return null;
  const days = (kv.BYDAY ?? "").split(",").filter(Boolean).map((c) => DAY_CODES.indexOf(c));
  if (days.some((d) => d < 0)) return null;
  const monthDay = kv.BYMONTHDAY ? Number(kv.BYMONTHDAY) : 1;
  if (freq === "WEEKLY" && days.length === 0) return null;
  if (freq === "MONTHLY" && !(monthDay >= 1 && monthDay <= 31)) return null;
  return { freq: freq as Freq, days, monthDay, hour: +at[1], minute: +at[2] };
}

function matchesDay(spec: RuleSpec, y: number, m: number, d: number) {
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
  switch (spec.freq) {
    case "DAILY": return true;
    case "WEEKDAYS": return dow >= 1 && dow <= 5;
    case "WEEKLY": return spec.days.includes(dow);
    case "MONTHLY": return d === Math.min(spec.monthDay, dim);
  }
}

/** Occurrences with from < occurrence <= to, in time order. */
export function occurrencesBetween(rule: string, from: Date, to: Date): Date[] {
  const spec = parseRRule(rule);
  if (!spec || to <= from) return [];
  const start = toIstParts(from);
  const out: Date[] = [];
  const days = Math.min(70, Math.ceil((to.getTime() - from.getTime()) / 864e5) + 2);
  for (let i = -1; i <= days; i++) {
    const norm = new Date(Date.UTC(start.y, start.m, start.d + i)); // normalises month/year overflow
    const [y, m, d] = [norm.getUTCFullYear(), norm.getUTCMonth(), norm.getUTCDate()];
    if (!matchesDay(spec, y, m, d)) continue;
    const at = fromIst(y, m, d, spec.hour, spec.minute);
    if (at > from && at <= to) out.push(at);
  }
  return out;
}

export function nextOccurrence(rule: string, after = new Date()): Date | null {
  return occurrencesBetween(rule, after, new Date(after.getTime() + 62 * 864e5))[0] ?? null;
}

export function describeRRule(str: string) {
  const s = parseRRule(str);
  if (!s) return "Invalid rule";
  const t = new Date(Date.UTC(2000, 0, 1, s.hour, s.minute));
  const time = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", hour: "numeric", minute: "2-digit", hour12: true }).format(t);
  switch (s.freq) {
    case "DAILY": return `Every day at ${time}`;
    case "WEEKDAYS": return `Every weekday at ${time}`;
    case "WEEKLY": return `Every ${[...s.days].sort().map((d) => DAY_NAMES[d]).join(" & ")} at ${time}`;
    case "MONTHLY": return `Day ${s.monthDay} of every month at ${time}`;
  }
}
