import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { prepareRule, ruleSchema } from "@/lib/recurringRules";
import { generateForRule } from "@/lib/recurring";

async function loadEditable(u: { id: string; role: string }, id: string) {
  const rule = await db.recurringRule.findUnique({ where: { id } });
  if (!rule) throw new HttpError(404, "Not found");
  // Founders can change any rule; managers only the ones they created.
  if (u.role !== "FOUNDER" && rule.creatorId !== u.id) throw new HttpError(403, "You can only change recurring activities you created");
  return rule;
}

// Pause / resume: { active: boolean }.  Full edit: the same body as create.
export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isLead(u)) throw new HttpError(403, "Only founders and managers can manage recurring activities");
  const rule = await loadEditable(u, params.id);
  const body = await req.json();
  const toggle = z.object({ active: z.boolean() }).safeParse(body);
  if (toggle.success && Object.keys(body).length === 1) {
    await db.recurringRule.update({ where: { id: rule.id }, data: { active: toggle.data.active } });
    await db.auditLog.create({ data: { actorId: u.id, action: toggle.data.active ? "RECURRING_RESUMED" : "RECURRING_PAUSED", target: rule.id, meta: rule.title } });
    return NextResponse.json({ ok: true });
  }
  const data = await prepareRule(u, ruleSchema.parse(body));
  const updated = await db.recurringRule.update({ where: { id: rule.id }, data });
  await db.auditLog.create({ data: { actorId: u.id, action: "RECURRING_UPDATED", target: rule.id, meta: updated.title } });
  // Already-generated instances are left alone; the new schedule applies from the next occurrence.
  await generateForRule(updated);
  return NextResponse.json({ ok: true });
});
