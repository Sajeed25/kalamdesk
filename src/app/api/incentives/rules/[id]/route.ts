import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { ruleSchema } from "@/lib/incentives";

// Rules are deactivated, not deleted, so existing awards keep their history. Pause/resume: { active }.
export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can manage incentive rules");
  const rule = await db.incentiveRule.findUnique({ where: { id: params.id } });
  if (!rule) throw new HttpError(404, "Rule not found");
  const body = await req.json();
  const toggle = z.object({ active: z.boolean() }).safeParse(body);
  if (toggle.success && Object.keys(body).length === 1) {
    await db.incentiveRule.update({ where: { id: rule.id }, data: { active: toggle.data.active } });
    await db.auditLog.create({ data: { actorId: u.id, action: toggle.data.active ? "INCENTIVE_RULE_RESUMED" : "INCENTIVE_RULE_PAUSED", target: rule.id, meta: rule.name } });
    return NextResponse.json({ ok: true });
  }
  const r = ruleSchema.parse(body);
  await db.incentiveRule.update({ where: { id: rule.id }, data: { ...r, topN: r.kind === "TOP_N" ? r.topN ?? null : null } });
  await db.auditLog.create({ data: { actorId: u.id, action: "INCENTIVE_RULE_UPDATED", target: rule.id, meta: r.name } });
  return NextResponse.json({ ok: true });
});
