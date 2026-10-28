import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Private calendar feed (iCalendar). The link contains the person's id and an HMAC signed with the server secret
 * and a per-person salt. Anyone holding the link can read that person's task titles, so it must be kept private;
 * "Reset link" changes the salt, which instantly kills the old link.
 */
const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (>= 32 chars)");
  return s;
};
export const newSalt = () => randomBytes(16).toString("hex");

const sig = (userId: string, salt: string) => createHmac("sha256", key()).update(`ics:${userId}:${salt}`).digest("base64url").slice(0, 32);
export const makeToken = (userId: string, salt: string) => `${userId}.${sig(userId, salt)}`;

export function userIdFromToken(token: string): string | null {
  const t = token.replace(/[.]ics$/i, "");
  const i = t.lastIndexOf(".");
  return i > 0 && /^[a-z0-9]{10,40}$/i.test(t.slice(0, i)) ? t.slice(0, i) : null;
}
export function verifyToken(token: string, salt: string): boolean {
  const t = token.replace(/[.]ics$/i, "");
  const userId = userIdFromToken(t);
  if (!userId) return false;
  const given = Buffer.from(t.slice(userId.length + 1));
  const want = Buffer.from(sig(userId, salt));
  return given.length === want.length && timingSafeEqual(given, want);
}

// ---------- RFC 5545 text helpers ----------
export const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
export const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/[.]\d{3}/, "");

/** Lines longer than 75 octets are folded with CRLF + one space (counting UTF-8 bytes, never splitting a character). */
export function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export type IcsEvent = { uid: string; title: string; start: Date; minutes?: number; description?: string; url?: string; priority?: string; location?: string | null; stamp?: Date };
const PRI: Record<string, number> = { P1: 1, P2: 3, P3: 5, P4: 9 };

export function buildCalendar(name: string, events: IcsEvent[]): string {
  const now = new Date();
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KalamDesk//Tasks//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(name)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@kalamdesk`,
      `DTSTAMP:${icsDate(e.stamp ?? now)}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(new Date(e.start.getTime() + (e.minutes ?? 30) * 60000))}`,
      `SUMMARY:${icsEscape(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.priority && PRI[e.priority]) lines.push(`PRIORITY:${PRI[e.priority]}`);
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Task due", "TRIGGER:-PT30M", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
