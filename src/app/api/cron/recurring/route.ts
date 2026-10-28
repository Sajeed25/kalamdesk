import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { generateDue, markMissed } from "@/lib/recurring";
import { applyOverduePenalties } from "@/lib/scoring";
import { istDateKey } from "@/lib/time";

// Every 15 minutes: create upcoming recurring instances, close missed ones, and (once a day) apply
// overdue penalties. All three are idempotent, so overlapping or retried runs are harmless.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const generated = await generateDue(now);
  const missed = await markMissed(now);

  let penalties = 0;
  try {
    await db.jobRun.create({ data: { kind: "penalty-day", key: istDateKey(now) } });
    penalties = await applyOverduePenalties(now);
  } catch {
    /* already ran today */
  }
  return NextResponse.json({ generated, missed, penalties });
}
