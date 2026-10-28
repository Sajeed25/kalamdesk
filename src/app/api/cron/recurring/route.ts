import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { forEachOrg } from "@/lib/orgs";
import { generateDue, markMissed } from "@/lib/recurring";
import { applyOverduePenalties } from "@/lib/scoring";
import { istDateKey } from "@/lib/time";

// Every 15 minutes: create upcoming recurring instances, close missed ones, and (once a day) apply
// overdue penalties, separately inside each organisation. All three are idempotent, so overlapping or retried runs are harmless.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  let generated = 0, missed = 0, penalties = 0;
  await forEachOrg(async (org) => {
    generated += await generateDue(now);
    missed += await markMissed(now);
    try {
      await db.jobRun.create({ data: { kind: "penalty-day", key: `${istDateKey(now)}:${org.id}` } });
      penalties += await applyOverduePenalties(now);
    } catch {
      /* already ran today */
    }
  });
  return NextResponse.json({ generated, missed, penalties });
}
