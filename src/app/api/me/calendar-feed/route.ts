import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { makeToken, newSalt } from "@/lib/ics";

// Returns this person's private calendar link, creating it on first use. { rotate: true } issues a new link
// and the old one stops working immediately.
export const POST = authed(async (req, u) => {
  const { rotate } = z.object({ rotate: z.boolean().optional() }).parse(await req.json().catch(() => ({})));
  let feed = await db.calendarFeed.findUnique({ where: { userId: u.id } });
  if (!feed || rotate) {
    feed = await db.calendarFeed.upsert({ where: { userId: u.id }, update: { salt: newSalt() }, create: { userId: u.id, salt: newSalt() } });
    await db.auditLog.create({ data: { actorId: u.id, action: rotate ? "CALENDAR_LINK_RESET" : "CALENDAR_LINK_CREATED", target: u.id } });
  }
  return NextResponse.json({ url: appUrl(`/api/calendar/${makeToken(u.id, feed.salt)}.ics`) }, { headers: { "Cache-Control": "no-store" } });
});
