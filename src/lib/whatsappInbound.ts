import { createHmac, timingSafeEqual } from "crypto";

/** Short code shown in WhatsApp alerts so people can reply about a specific task: the last 6 characters of its id. */
export const taskCode = (id: string) => id.slice(-6).toLowerCase();

export type Command =
  | { kind: "done" | "start"; code: string }
  | { kind: "blocked"; code: string; text: string }
  | { kind: "update"; text: string }
  | { kind: "tasks" | "help" | "unknown" };

/**
 * Understands short replies such as:  done a1b2c3 · start a1b2c3 · blocked a1b2c3 waiting for the principal
 *                                      update 28 calls and 2 visits · tasks · help
 * Case-insensitive, tolerant of a leading "#" on the code and of extra spaces.
 */
export function parseCommand(raw: string): Command {
  const text = raw.replace(/\s+/g, " ").trim();
  const m = /^(\S+)(?: (.*))?$/.exec(text);
  if (!m) return { kind: "unknown" };
  const verb = m[1].toLowerCase().replace(/[.!:,]+$/, "");
  const rest = (m[2] ?? "").trim();
  const codeMatch = /^#?([a-z0-9]{6})(?: (.*))?$/i.exec(rest);

  if (["done", "finished", "complete", "completed"].includes(verb) && codeMatch) return { kind: "done", code: codeMatch[1].toLowerCase() };
  if (["start", "started", "working"].includes(verb) && codeMatch) return { kind: "start", code: codeMatch[1].toLowerCase() };
  if (["blocked", "block", "stuck"].includes(verb) && codeMatch && (codeMatch[2] ?? "").trim().length >= 3) return { kind: "blocked", code: codeMatch[1].toLowerCase(), text: codeMatch[2].trim().slice(0, 500) };
  if (["update", "standup", "stand-up", "eod"].includes(verb) && rest.length >= 3) return { kind: "update", text: rest.slice(0, 1800) };
  if (["tasks", "today", "list", "my"].includes(verb)) return { kind: "tasks" };
  if (["help", "hi", "hello", "menu", "?"].includes(verb)) return { kind: "help" };
  return { kind: "unknown" };
}

export const HELP_TEXT =
  "KalamDesk commands:\n• DONE <code>  mark a task done\n• START <code>  mark it in progress\n• BLOCKED <code> <reason>\n• UPDATE <what you did today>  files your stand-up\n• TASKS  see what is due\nThe <code> is the 6-character code in each alert.";

/** Meta signs the raw request body: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(appSecret, body). */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const want = Buffer.from(createHmac("sha256", appSecret).update(rawBody).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return got.length === want.length && timingSafeEqual(got, want);
}

export type InboundMessage = { id: string; from: string; text: string };

/** Pulls plain-text messages out of a WhatsApp Cloud API webhook payload. Anything else is ignored. */
export function extractMessages(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  const p = payload as { entry?: { changes?: { value?: { messages?: { id?: string; from?: string; type?: string; text?: { body?: string } }[] } }[] }[] };
  for (const e of p?.entry ?? [])
    for (const c of e.changes ?? [])
      for (const m of c.value?.messages ?? [])
        if (m.type === "text" && m.id && m.from && typeof m.text?.body === "string") out.push({ id: m.id, from: m.from, text: m.text.body.slice(0, 2000) });
  return out;
}
