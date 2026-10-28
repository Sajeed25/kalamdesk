import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { confirmIdentity, disableTwoFactor } from "@/lib/twofa";

// Turning 2FA off needs the password AND a current code, so someone at an unlocked laptop cannot do it.
export const POST = authed(async (req, u) => {
  const b = z.object({ password: z.string().min(1), code: z.string().optional() }).parse(await req.json());
  const row = await db.user.findUnique({ where: { id: u.id }, select: { totpSecret: true } });
  if (!row?.totpSecret) throw new HttpError(409, "Two-step sign-in is not on");
  const c = await confirmIdentity(u.id, b.password, b.code);
  if (!c.ok) return NextResponse.json({ error: c.error, needs2fa: c.needs2fa }, { status: c.status });
  await disableTwoFactor(u.id);
  await db.auditLog.create({ data: { actorId: u.id, action: "TWOFA_DISABLED", target: u.id } });
  return NextResponse.json({ ok: true });
});
