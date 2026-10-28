import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { istDateKey } from "@/lib/time";

// "I'm in" / "I'm out". The SERVER stamps the time (a phone clock is never trusted); one row per person per day.
export const POST = authed(async (req, u) => {
  const { action } = z.object({ action: z.enum(["in", "out"]) }).parse(await req.json());
  const forDate = istDateKey();
  const row = await db.attendanceLog.findUnique({ where: { userId_forDate: { userId: u.id, forDate } } });
  const now = new Date();
  if (action === "in") {
    if (row) throw new HttpError(409, "You're already checked in today");
    await db.attendanceLog.create({ data: { userId: u.id, forDate, checkInAt: now } });
    return NextResponse.json({ checkInAt: now.toISOString() }, { status: 201 });
  }
  if (!row) throw new HttpError(409, "Check in first");
  if (row.checkOutAt) throw new HttpError(409, "You've already checked out today");
  await db.attendanceLog.update({ where: { id: row.id }, data: { checkOutAt: now } });
  return NextResponse.json({ checkOutAt: now.toISOString() });
});
