import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { parseValidUntil, programSchema } from "@/lib/referrals";

export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can open referral programs");
  const p = programSchema.parse(await req.json());
  const program = await db.referralProgram.create({ data: { name: p.name, reward: p.reward, rewardInr: p.rewardInr ?? null, validUntil: parseValidUntil(p.validUntil), active: p.active } });
  await db.auditLog.create({ data: { actorId: u.id, action: "REFERRAL_PROGRAM_CREATED", target: program.id, meta: program.name } });
  return NextResponse.json({ program }, { status: 201 });
});
