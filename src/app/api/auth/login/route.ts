import { NextResponse } from "next/server";
import { z } from "zod";
import { dbRaw as db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { setPending } from "@/lib/twofa";

// Naive in-memory throttle (per instance). Use Redis/Upstash for multi-instance production.
const fails = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("[login] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "The server is not configured correctly (database or SESSION_SECRET). See /api/health." }, { status: 500 });
  }
}

async function handle(req: Request) {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Enter email and password" }, { status: 400 });
  const email = body.data.email.toLowerCase();
  const f = fails.get(email);
  if (f && f.until > Date.now() && f.n >= 5) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  const user = await db.user.findUnique({ where: { email } });
  const ok = user && user.active && (await verifyPassword(body.data.password, user.passwordHash));
  if (!ok) {
    fails.set(email, { n: (f?.n ?? 0) + 1, until: Date.now() + 10 * 60 * 1000 });
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }
  fails.delete(email);
  if (!user.allOrgs && user.orgId && !(await db.organization.count({ where: { id: user.orgId, active: true } })))
    return NextResponse.json({ error: "Your organisation has been archived. Ask your founder." }, { status: 403 });

  // Two-step sign-in: the password alone only earns a 5-minute "pending" pass. No session yet.
  if (user.totpSecret) {
    await setPending(user.id);
    return NextResponse.json({ ok: true, needs2fa: true });
  }
  await createSession(user);
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
