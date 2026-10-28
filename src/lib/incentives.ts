import type { IncentiveRule } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { fromIst, toIstParts } from "./time";
import { personMetrics, type PersonMetrics, type Range } from "./metrics";

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must look like 2026-10");

export const ruleSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    kind: z.enum(["THRESHOLD", "TOP_N"]),
    audience: z.enum(["ALL", "EMPLOYEE", "INTERN"]),
    minPoints: z.number().min(0).max(100000).default(0),
    minOnTimePct: z.number().min(0).max(100).default(0),
    topN: z.number().int().min(1).max(20).nullish(),
    amountInr: z.number().int().min(1).max(10_000_000),
    active: z.boolean().default(true),
  })
  .superRefine((r, ctx) => {
    if (r.kind === "TOP_N") {
      if (!r.topN) ctx.addIssue({ code: "custom", path: ["topN"], message: "Say how many top people get the reward" });
      if (r.audience === "ALL") ctx.addIssue({ code: "custom", path: ["audience"], message: "Top-N rewards are ranked within employees or within interns, so pick one" });
    }
  });

export function monthRange(month: string): Range {
  const [y, m] = month.split("-").map(Number);
  return { from: fromIst(y, m - 1, 1), to: fromIst(y, m, 1), label: month };
}

export function currentMonthKey(now = new Date()) {
  const p = toIstParts(now);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}`;
}
export function previousMonthKey(now = new Date()) {
  const p = toIstParts(now);
  const d = new Date(Date.UTC(p.y, p.m - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const inAudience = (role: string, audience: string) =>
  audience === "ALL" ? role !== "FOUNDER" : audience === "INTERN" ? role === "INTERN" : role === "EMPLOYEE" || role === "MANAGER";

/** Pure decision logic, kept separate so it can be tested without a database. */
export function eligibleFor(
  rule: Pick<IncentiveRule, "kind" | "minPoints" | "minOnTimePct" | "topN" | "audience">,
  people: { userId: string; role: string; m: PersonMetrics }[]
): Map<string, string> {
  const pool = people.filter((p) => inAudience(p.role, rule.audience));
  const out = new Map<string, string>();
  if (rule.kind === "TOP_N") {
    const ranked = pool.filter((p) => p.m.points > 0).sort((a, b) => b.m.points - a.m.points || (b.m.onTimePct ?? -1) - (a.m.onTimePct ?? -1));
    ranked.slice(0, rule.topN ?? 0).forEach((p, i) => out.set(p.userId, `Rank ${i + 1} of ${pool.length}: ${p.m.points} points`));
    return out;
  }
  for (const p of pool) {
    const { points, onTimePct, completed } = p.m;
    if (completed < 1) continue; // nothing delivered, nothing to reward
    if (points < rule.minPoints) continue;
    if (rule.minOnTimePct > 0 && (onTimePct === null || onTimePct < rule.minOnTimePct)) continue;
    out.set(p.userId, `${points} points${onTimePct === null ? "" : `, ${onTimePct}% on time`}`);
  }
  return out;
}

/**
 * Creates PENDING awards for everyone who qualifies under an active rule for the month. Safe to run
 * repeatedly: one JobRun row per (rule, month, person), so nobody is awarded twice, and a rejected award
 * stays rejected. Nothing is paid or approved here; a founder reviews each one.
 */
export async function calculateMonth(month: string) {
  const range = monthRange(month);
  const [rules, users] = await Promise.all([
    db.incentiveRule.findMany({ where: { active: true } }),
    db.user.findMany({ where: { active: true, role: { not: "FOUNDER" } }, select: { id: true, role: true } }),
  ]);
  const metrics = await personMetrics(users.map((u) => u.id), range);
  const people = users.map((u) => ({ userId: u.id, role: u.role, m: metrics.get(u.id)! }));

  let created = 0;
  let qualifying = 0;
  for (const rule of rules) {
    for (const [userId, why] of eligibleFor(rule, people)) {
      qualifying++;
      try {
        await db.jobRun.create({ data: { kind: "incentive", key: `${rule.id}:${month}:${userId}` } });
      } catch {
        continue; // already generated (or rejected earlier)
      }
      await db.incentiveAward.create({ data: { userId, ruleId: rule.id, month, amountInr: rule.amountInr, reason: `${rule.name} (${month}): ${why}`.slice(0, 500) } });
      created++;
    }
  }
  return { month, rules: rules.length, qualifying, created };
}

export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
