import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { notify } from "@/lib/notify";
import { confirmIdentity, disableTwoFactor } from "@/lib/twofa";

// Recovery path when someone lost their phone AND their recovery codes: another founder switches their 2FA off
// (after re-entering their own password and code). The person is told, and it is audited.
export const POST = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can reset someone's two-step sign-in");
  if (params.id === u.id) throw new HttpError(400, "Use Settings > Security to turn off your own");
  const b = z.object({ password: z.string().min(1), code: z.string().optional() }).parse(await req.json());
  const target = await db.user.findUnique({ where: { id: params.id }, select: { id: true, name: true, totpSecret: true } });
  if (!target) throw new HttpError(404, "Person not found");
  if (!target.totpSecret) throw new HttpError(409, "They do not have two-step sign-in on");
  const c = await confirmIdentity(u.id, b.password, b.code);
  if (!c.ok) return NextResponse.json({ error: c.error, needs2fa: c.needs2fa }, { status: c.status });
  await disableTwoFactor(target.id);
  await db.auditLog.create({ data: { actorId: u.id, action: "TWOFA_RESET_BY_FOUNDER", target: target.id } });
  await notify({ userId: target.id, kind: "STATUS", title: "Your two-step sign-in was reset", body: `${u.name} switched it off because you asked for help. Please turn it back on in Settings > Security.`, url: "/settings/security" });
  return NextResponse.json({ ok: true });
});
