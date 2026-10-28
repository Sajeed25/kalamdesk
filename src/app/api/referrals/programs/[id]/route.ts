import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { parseValidUntil, programSchema } from "@/lib/referrals";

// Programs are paused, never deleted, so existing referrals keep their program. Pause/resume: { active }.
export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can manage referral programs");
  const program = await db.referralProgram.findUnique({ where: { id: params.id } });
  if (!program) throw new HttpError(404, "Program not found");
  const body = await req.json();
  const toggle = z.object({ active: z.boolean() }).safeParse(body);
  if (toggle.success && Object.keys(body).length === 1) {
    await db.referralProgram.update({ where: { id: program.id }, data: { active: toggle.data.active } });
  } else {
    const p = programSchema.parse(body);
    await db.referralProgram.update({ where: { id: program.id }, data: { name: p.name, reward: p.reward, rewardInr: p.rewardInr ?? null, validUntil: parseValidUntil(p.validUntil), active: p.active } });
  }
  await db.auditLog.create({ data: { actorId: u.id, action: "REFERRAL_PROGRAM_UPDATED", target: program.id, meta: program.name } });
  return NextResponse.json({ ok: true });
});
