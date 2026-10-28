import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { prepareRule, ruleSchema } from "@/lib/recurringRules";
import { generateForRule } from "@/lib/recurring";

export const POST = authed(async (req, u) => {
  const data = await prepareRule(u, ruleSchema.parse(await req.json()));
  const rule = await db.recurringRule.create({ data: { ...data, creatorId: u.id } });
  await db.auditLog.create({ data: { actorId: u.id, action: "RECURRING_CREATED", target: rule.id, meta: rule.title } });
  // If the next occurrence is already inside its lead window, create it now rather than at the next cron tick.
  const generated = await generateForRule(rule);
  return NextResponse.json({ rule, generated }, { status: 201 });
});
