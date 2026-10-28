import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { confirmIdentity, regenerateRecoveryCodes } from "@/lib/twofa";

// New set of recovery codes (the old ones stop working). Same password + code check as turning 2FA off.
export const POST = authed(async (req, u) => {
  const b = z.object({ password: z.string().min(1), code: z.string().optional() }).parse(await req.json());
  const row = await db.user.findUnique({ where: { id: u.id }, select: { totpSecret: true } });
  if (!row?.totpSecret) throw new HttpError(409, "Two-step sign-in is not on");
  const c = await confirmIdentity(u.id, b.password, b.code);
  if (!c.ok) return NextResponse.json({ error: c.error, needs2fa: c.needs2fa }, { status: c.status });
  const codes = await regenerateRecoveryCodes(u.id);
  await db.auditLog.create({ data: { actorId: u.id, action: "TWOFA_RECOVERY_REGENERATED", target: u.id } });
  return NextResponse.json({ ok: true, recoveryCodes: codes }, { headers: { "Cache-Control": "no-store" } });
});
