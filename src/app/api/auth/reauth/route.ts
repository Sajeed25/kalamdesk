import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { grantReauth, REAUTH_SECONDS } from "@/lib/reauth";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";

// Per-instance throttle: 5 wrong passwords in 10 minutes locks re-auth for that period.
const fails = new Map<string, { n: number; until: number }>();

export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can view sensitive details");
  const { password } = z.object({ password: z.string().min(1).max(200) }).parse(await req.json());
  const f = fails.get(u.id);
  if (f && f.until > Date.now() && f.n >= 5) throw new HttpError(429, "Too many wrong passwords. Try again in a few minutes.");

  const row = await db.user.findUnique({ where: { id: u.id } });
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    fails.set(u.id, { n: (f?.n ?? 0) + 1, until: Date.now() + 10 * 60 * 1000 });
    await db.auditLog.create({ data: { actorId: u.id, action: "REAUTH_FAILED", target: u.id } });
    throw new HttpError(401, "Wrong password");
  }
  fails.delete(u.id);
  await grantReauth(u.id);
  return NextResponse.json({ ok: true, validForSeconds: REAUTH_SECONDS }, { headers: { "Cache-Control": "no-store" } });
});
