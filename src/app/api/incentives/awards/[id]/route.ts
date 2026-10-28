import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { notify } from "@/lib/notify";
import { inr } from "@/lib/incentives";

const ACTIONS = ["approve", "unapprove", "paid", "unpaid", "reject"] as const;

// Founder review of one award. approve -> paid is the only path to "paid"; a paid award cannot be rejected.
export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can review awards");
  const { action } = z.object({ action: z.enum(ACTIONS) }).parse(await req.json());
  const a = await db.incentiveAward.findUnique({ where: { id: params.id } });
  if (!a) throw new HttpError(404, "Award not found");

  switch (action) {
    case "approve":
      if (a.approved) throw new HttpError(409, "Already approved");
      await db.incentiveAward.update({ where: { id: a.id }, data: { approved: true } });
      await notify({ userId: a.userId, kind: "APPROVED", title: `Incentive approved: ${inr(a.amountInr)}`, body: a.reason, url: "/incentives" });
      break;
    case "unapprove":
      if (a.paid) throw new HttpError(409, "Mark it unpaid first");
      await db.incentiveAward.update({ where: { id: a.id }, data: { approved: false } });
      break;
    case "paid":
      if (!a.approved) throw new HttpError(409, "Approve the award before marking it paid");
      await db.incentiveAward.update({ where: { id: a.id }, data: { paid: true } });
      await notify({ userId: a.userId, kind: "APPROVED", title: `Incentive paid: ${inr(a.amountInr)}`, body: a.reason, url: "/incentives", email: false });
      break;
    case "unpaid":
      await db.incentiveAward.update({ where: { id: a.id }, data: { paid: false } });
      break;
    case "reject":
      if (a.paid) throw new HttpError(409, "A paid award cannot be rejected");
      // The calculation's JobRun key stays, so the same award is never regenerated after a rejection.
      await db.incentiveAward.delete({ where: { id: a.id } });
      break;
  }
  await db.auditLog.create({ data: { actorId: u.id, action: `INCENTIVE_${action.toUpperCase()}`, target: a.id, meta: `${a.month} ${a.amountInr}` } });
  return NextResponse.json({ ok: true });
});
