import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { ruleSchema } from "@/lib/incentives";

export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can manage incentive rules");
  const r = ruleSchema.parse(await req.json());
  const rule = await db.incentiveRule.create({ data: { ...r, topN: r.kind === "TOP_N" ? r.topN ?? null : null } });
  await db.auditLog.create({ data: { actorId: u.id, action: "INCENTIVE_RULE_CREATED", target: rule.id, meta: rule.name } });
  return NextResponse.json({ rule }, { status: 201 });
});
