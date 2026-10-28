import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { calculateMonth, monthSchema } from "@/lib/incentives";

export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can run the incentive calculation");
  const { month } = z.object({ month: monthSchema }).parse(await req.json());
  const result = await calculateMonth(month);
  await db.auditLog.create({ data: { actorId: u.id, action: "INCENTIVES_CALCULATED", target: month, meta: `${result.created} new awards` } });
  return NextResponse.json(result);
});
