import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { clearFails, clearPending, isThrottled, readPending, recordFail, recoveryRemaining, verifyCode } from "@/lib/twofa";

// Step two of sign-in: needs the pending pass from step one (password) plus a valid code.
export async function POST(req: Request) {
  const body = z.object({ code: z.string().min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Enter your code" }, { status: 400 });
  const uid = await readPending();
  if (!uid) return NextResponse.json({ error: "Your sign-in expired. Enter your password again.", expired: true }, { status: 401 });
  if (isThrottled(uid)) return NextResponse.json({ error: "Too many wrong codes. Try again in a few minutes." }, { status: 429 });

  const user = await db.user.findUnique({ where: { id: uid } });
  if (!user || !user.active || !user.totpSecret) return NextResponse.json({ error: "Sign in again", expired: true }, { status: 401 });

  const kind = await verifyCode(user, body.data.code);
  if (!kind) {
    recordFail(uid);
    await db.auditLog.create({ data: { actorId: uid, action: "LOGIN_2FA_FAILED", target: uid } });
    return NextResponse.json({ error: "That code didn't work. Check the time on your phone and try the newest code." }, { status: 401 });
  }
  clearFails(uid);
  clearPending();
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  await db.auditLog.create({ data: { actorId: uid, action: kind === "recovery" ? "LOGIN_2FA_RECOVERY" : "LOGIN_2FA", target: uid } });
  return NextResponse.json({ ok: true, usedRecovery: kind === "recovery", recoveryLeft: kind === "recovery" ? await recoveryRemaining(uid) : undefined });
}
