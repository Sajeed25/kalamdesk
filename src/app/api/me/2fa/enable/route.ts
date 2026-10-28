import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { matchTotp } from "@/lib/totp";
import { clearSetup, enableTwoFactor, readSetup } from "@/lib/twofa";

// Step 2: the person types the current code from their app. Only then is 2FA switched on, and the
// recovery codes are shown exactly once.
export const POST = authed(async (req, u) => {
  const { code } = z.object({ code: z.string().min(6).max(10) }).parse(await req.json());
  const secret = await readSetup(u.id);
  if (!secret) throw new HttpError(400, "Setup expired. Start again.");
  if (matchTotp(secret, code) === null) throw new HttpError(400, "That code didn't match. Check the time on your phone and try the newest code.");
  const codes = await enableTwoFactor(u.id, secret);
  clearSetup();
  await db.auditLog.create({ data: { actorId: u.id, action: "TWOFA_ENABLED", target: u.id } });
  return NextResponse.json({ ok: true, recoveryCodes: codes }, { headers: { "Cache-Control": "no-store" } });
});
