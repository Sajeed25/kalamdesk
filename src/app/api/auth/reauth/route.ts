import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { grantReauth, REAUTH_SECONDS } from "@/lib/reauth";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { confirmIdentity } from "@/lib/twofa";

// Per-instance throttle on wrong passwords: 5 in 10 minutes locks re-auth for that period.
// (Wrong 2FA codes have their own throttle inside confirmIdentity.)
const fails = new Map<string, { n: number; until: number }>();

export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can view sensitive details");
  const { password, code } = z.object({ password: z.string().min(1).max(200), code: z.string().max(40).optional() }).parse(await req.json());
  const f = fails.get(u.id);
  if (f && f.until > Date.now() && f.n >= 5) throw new HttpError(429, "Too many wrong passwords. Try again in a few minutes.");

  // Password, plus a current authenticator/recovery code when this founder has 2FA on.
  const c = await confirmIdentity(u.id, password, code);
  if (!c.ok) {
    if (!c.needs2fa) fails.set(u.id, { n: (f?.n ?? 0) + 1, until: Date.now() + 10 * 60 * 1000 });
    await db.auditLog.create({ data: { actorId: u.id, action: "REAUTH_FAILED", target: u.id, meta: c.needs2fa ? "code" : "password" } });
    return NextResponse.json({ error: c.error, needs2fa: c.needs2fa }, { status: c.status });
  }
  fails.delete(u.id);
  await grantReauth(u.id);
  return NextResponse.json({ ok: true, validForSeconds: REAUTH_SECONDS }, { headers: { "Cache-Control": "no-store" } });
});
