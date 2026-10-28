import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, updateTask } from "@/lib/tasks";
import { normalizePhone, sendWhatsappText, whatsappConfigured } from "@/lib/whatsapp";
import { HELP_TEXT, extractMessages, parseCommand, taskCode, verifySignature, type Command } from "@/lib/whatsappInbound";
import { endOfIstDay, fmtDateTime, istDateKey } from "@/lib/time";
import { standupStreak } from "@/lib/gamify";
import type { SessionUser } from "@/lib/auth";
import type { Role } from "@/lib/constants";

/**
 * WhatsApp Cloud API webhook: staff reply to an alert ("DONE a1b2c3") and the task updates.
 * Security: (1) every POST must carry Meta's HMAC signature over the raw body (WHATSAPP_APP_SECRET) or it is
 * rejected, (2) the sender's number must belong to a person who opted in, (3) the update runs with THAT person's
 * permissions through the same rules as the website, (4) each message id is processed once.
 */

// Meta's one-time verification handshake when you register the webhook.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === token) return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !whatsappConfigured()) return NextResponse.json({ error: "WhatsApp replies are not set up" }, { status: 503 });
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), secret)) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  // Meta retries anything that is not a 200, so we always answer 200 once the signature is good.
  const optedIn = await db.employeeProfile.findMany({ where: { whatsappOptIn: true, phone: { not: null } }, select: { userId: true, phone: true } });
  for (const m of extractMessages(payload)) {
    try {
      await db.jobRun.create({ data: { kind: "wa-in", key: m.id } });
    } catch {
      continue; // already handled
    }
    const person = optedIn.find((p) => normalizePhone(p.phone) === m.from);
    if (!person) continue; // unknown or not opted in: say nothing
    const user = await db.user.findFirst({ where: { id: person.userId, active: true } });
    if (!user) continue;
    const me: SessionUser = { id: user.id, name: user.name, email: user.email, role: user.role as Role, departmentId: user.departmentId, consentAt: user.consentAt };
    const reply = await run(me, parseCommand(m.text)).catch((e) => (e instanceof HttpError ? `Sorry: ${e.message}` : "Sorry, something went wrong. Please use the app."));
    await sendWhatsappText(m.from, reply);
    await db.auditLog.create({ data: { actorId: user.id, action: "WHATSAPP_COMMAND", target: user.id, meta: m.text.slice(0, 120) } });
  }
  return NextResponse.json({ ok: true });
}

async function findOpen(userId: string, code: string) {
  const tasks = await db.task.findMany({ where: { id: { endsWith: code }, assignees: { some: { userId } }, status: { notIn: ["DONE", "CANCELLED"] } }, select: { id: true, title: true, requiresProof: true } });
  if (tasks.length === 0) throw new HttpError(404, `I can't find an open task of yours with code ${code}.`);
  if (tasks.length > 1) throw new HttpError(409, `More than one task matches ${code}. Please use the app.`);
  return tasks[0];
}

async function run(me: SessionUser, c: Command): Promise<string> {
  switch (c.kind) {
    case "help": case "unknown": return c.kind === "unknown" ? `I didn't understand that.\n\n${HELP_TEXT}` : HELP_TEXT;
    case "done": {
      const t = await findOpen(me.id, c.code);
      if (t.requiresProof) throw new HttpError(400, `"${t.title}" needs proof, so please finish it in the app.`);
      await updateTask(me, t.id, { status: "DONE" });
      const pts = (await db.scoreEvent.aggregate({ where: { taskId: t.id, userId: me.id }, _sum: { points: true } }))._sum.points ?? 0;
      return `✅ Done: ${t.title}${pts > 0 ? ` (+${Math.round(pts * 10) / 10} points)` : ""}. Nice work!`;
    }
    case "start": {
      const t = await findOpen(me.id, c.code);
      await updateTask(me, t.id, { status: "IN_PROGRESS" });
      return `▶️ In progress: ${t.title}`;
    }
    case "blocked": {
      const t = await findOpen(me.id, c.code);
      await updateTask(me, t.id, { status: "BLOCKED", blockedReason: c.text });
      return `⛔ Marked blocked: ${t.title}. The person who assigned it has been told.`;
    }
    case "update": {
      const forDate = istDateKey();
      const existing = await db.dailyUpdate.findUnique({ where: { userId_forDate: { userId: me.id, forDate } } });
      const finished = existing?.finished ? `${existing.finished} | ${c.text}`.slice(0, 2000) : c.text.slice(0, 2000);
      await db.dailyUpdate.upsert({ where: { userId_forDate: { userId: me.id, forDate } }, update: { finished }, create: { userId: me.id, forDate, finished } });
      const s = await standupStreak(me.id);
      return `📝 Stand-up saved.${s.count > 1 ? ` 🔥 ${s.count}-day streak!` : ""}`;
    }
    case "tasks": {
      const open = await db.task.findMany({ where: { assignees: { some: { userId: me.id } }, status: { notIn: ["DONE", "CANCELLED"] }, dueAt: { lte: endOfIstDay() } }, orderBy: [{ priority: "asc" }, { dueAt: "asc" }], take: 6, select: { id: true, title: true, priority: true, dueAt: true } });
      return open.length ? `Due today or overdue:\n${open.map((t) => `#${taskCode(t.id)} [${t.priority}] ${t.title}${t.dueAt ? ` (${fmtDateTime(t.dueAt)})` : ""}`).join("\n")}\n\nReply DONE <code> when finished.` : "Nothing due today. 🎉";
    }
  }
}
