import { z } from "zod";
import { db } from "./db";
import { currentMonthKey } from "./incentives";
import { notify } from "./notify";
import { endOfIstDay, fromIst } from "./time";

export const STAGES = ["SUBMITTED", "CONTACTED", "QUALIFIED", "CONVERTED", "REWARD_PAID"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted", CONTACTED: "Contacted", QUALIFIED: "Qualified", CONVERTED: "Converted", REWARD_PAID: "Reward paid",
};

export const programSchema = z.object({
  name: z.string().trim().min(2).max(100),
  reward: z.string().trim().min(1).max(150),
  rewardInr: z.number().int().min(1).max(10_000_000).nullish(),
  validUntil: z.string().nullish(), // YYYY-MM-DD, inclusive
  active: z.boolean().default(true),
});

export const referralSchema = z.object({
  programId: z.string(),
  name: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(5).max(150).refine((c) => /@/.test(c) || c.replace(/\D/g, "").length >= 7, "Give a phone number or an email address"),
  organisation: z.string().trim().max(150).nullish(),
  notes: z.string().trim().max(2000).default(""),
});

/** "2026-12-31" -> the last millisecond of that day in IST (stored as validUntil). */
export function parseValidUntil(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? endOfIstDay(fromIst(+m[1], +m[2] - 1, +m[3])) : null;
}

/** Programs accept submissions while active and until the end of the valid-until day (IST). */
export const programOpen = (p: { active: boolean; validUntil: Date | null }, now = new Date()) =>
  p.active && (!p.validUntil || now.getTime() <= p.validUntil.getTime());

/**
 * Moves a referral to a stage and keeps its reward in step. Idempotent:
 *  - CONVERTED creates ONE pending incentive award (if the program has a reward amount),
 *  - REWARD_PAID marks that award approved and paid (founder is paying it),
 *  - moving back out of REWARD_PAID marks it unpaid; the award itself is never duplicated.
 */
export async function moveReferral(referralId: string, stage: Stage, actorName: string) {
  const ref = await db.referral.findUnique({ where: { id: referralId }, include: { program: true } });
  if (!ref) return null;
  const idx = STAGES.indexOf(stage);
  let award = await db.incentiveAward.findFirst({ where: { referralId } });

  if (idx >= STAGES.indexOf("CONVERTED") && !award && ref.program.rewardInr) {
    try {
      await db.jobRun.create({ data: { kind: "referral-award", key: referralId } });
      award = await db.incentiveAward.create({
        data: { userId: ref.referrerId, referralId, month: currentMonthKey(), amountInr: ref.program.rewardInr, reason: `Referral reward: ${ref.name} (${ref.program.name})`.slice(0, 500) },
      });
    } catch {
      award = await db.incentiveAward.findFirst({ where: { referralId } });
    }
  }
  if (award) {
    if (stage === "REWARD_PAID" && !award.paid) await db.incentiveAward.update({ where: { id: award.id }, data: { approved: true, paid: true } });
    if (stage !== "REWARD_PAID" && award.paid) await db.incentiveAward.update({ where: { id: award.id }, data: { paid: false } });
  }
  const updated = await db.referral.update({ where: { id: referralId }, data: { status: stage } });
  if (ref.status !== stage)
    await notify({
      userId: ref.referrerId, kind: "STATUS", title: `Referral update: ${ref.name} is now ${STAGE_LABEL[stage].toLowerCase()}`,
      body: `${actorName} moved your referral (${ref.program.name}).`, url: "/referrals", email: stage === "CONVERTED" || stage === "REWARD_PAID",
    });
  return { referral: updated, award };
}
