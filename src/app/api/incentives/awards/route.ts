import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { monthSchema, inr } from "@/lib/incentives";
import { notify } from "@/lib/notify";

// A founder can grant a one-off award (e.g. a spot bonus). It is approved on creation because the founder is the approver.
export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can create awards");
  const b = z.object({ userId: z.string(), month: monthSchema, amountInr: z.number().int().min(1).max(10_000_000), reason: z.string().trim().min(3).max(400) }).parse(await req.json());
  const person = await db.user.findFirst({ where: { id: b.userId, active: true } });
  if (!person) throw new HttpError(400, "Unknown person");
  const award = await db.incentiveAward.create({ data: { userId: b.userId, month: b.month, amountInr: b.amountInr, reason: b.reason, approved: true } });
  await db.auditLog.create({ data: { actorId: u.id, action: "INCENTIVE_AWARD_MANUAL", target: award.id, meta: `${b.month} ${b.amountInr}` } });
  await notify({ userId: b.userId, kind: "APPROVED", title: `Incentive awarded: ${inr(b.amountInr)}`, body: b.reason, url: "/incentives" });
  return NextResponse.json({ award }, { status: 201 });
});
