import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { moveReferral, STAGES } from "@/lib/referrals";

// Founder moves a referral along the pipeline. The reward is credited/paid through incentives automatically.
export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can update referral status");
  const { status } = z.object({ status: z.enum(STAGES) }).parse(await req.json());
  const result = await moveReferral(params.id, status, u.name);
  if (!result) throw new HttpError(404, "Referral not found");
  await db.auditLog.create({ data: { actorId: u.id, action: "REFERRAL_STATUS", target: params.id, meta: status } });
  return NextResponse.json({ ok: true, rewardAward: result.award ? { amountInr: result.award.amountInr, approved: result.award.approved, paid: result.award.paid } : null });
});
