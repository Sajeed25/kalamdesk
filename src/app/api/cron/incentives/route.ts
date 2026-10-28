import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { calculateMonth, previousMonthKey } from "@/lib/incentives";
import { notify } from "@/lib/notify";

// 1st of the month: calculate last month's eligibility and tell the founders what is waiting for approval.
// Nothing is paid or approved automatically.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = previousMonthKey();
  const result = await calculateMonth(month);
  const pending = await db.incentiveAward.count({ where: { month, approved: false } });
  let notified = false;
  if (pending > 0) {
    try {
      await db.jobRun.create({ data: { kind: "incentive-notice", key: month } });
      const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
      for (const f of founders)
        await notify({ userId: f.id, kind: "REMINDER", title: `${pending} incentive award${pending > 1 ? "s" : ""} to review for ${month}`, body: "Open Incentives to approve or reject them.", url: "/incentives" });
      notified = true;
    } catch {
      /* already notified for this month */
    }
  }
  return NextResponse.json({ ...result, pending, notified });
}
