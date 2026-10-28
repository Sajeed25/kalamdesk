import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { calculateMonth, previousMonthKey } from "@/lib/incentives";
import { notify } from "@/lib/notify";
import { forEachOrg } from "@/lib/orgs";

// 1st of the month: calculate last month's eligibility (per organisation) and tell the founders what is waiting
// for approval. Nothing is paid or approved automatically.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = previousMonthKey();
  const runs = await forEachOrg(async (org) => {
    const result = await calculateMonth(month);
    const pending = await db.incentiveAward.count({ where: { month, approved: false } });
    let notified = false;
    if (pending > 0) {
      try {
        await db.jobRun.create({ data: { kind: "incentive-notice", key: `${month}:${org.id}` } });
        const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
        for (const f of founders)
          await notify({ userId: f.id, kind: "REMINDER", title: `${org.name}: ${pending} incentive award${pending > 1 ? "s" : ""} to review for ${month}`, body: "Open Incentives to approve or reject them.", url: "/incentives" });
        notified = true;
      } catch {
        /* already notified for this month */
      }
    }
    return { ...result, pending, notified };
  });
  return NextResponse.json({ organisations: runs.map((r) => ({ name: r.org.name, ...r.result })) });
}
