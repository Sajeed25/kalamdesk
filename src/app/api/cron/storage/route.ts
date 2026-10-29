import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api";
import { dbRaw } from "@/lib/db";
import { maintain } from "@/lib/storageMaintenance";
import { istDateKey } from "@/lib/time";

// Once a day: warn at 80% full; at 90% ask a group owner to approve a clean-up (or, if they switched Auto-rotate on, make room by itself).
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await dbRaw.jobRun.create({ data: { kind: "storage-check", key: istDateKey() } });
  } catch {
    return NextResponse.json({ skipped: "already checked today" });
  }
  return NextResponse.json(await maintain());
}
