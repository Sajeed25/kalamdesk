import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { istDateKey } from "@/lib/time";
import { HttpError } from "@/lib/tasks";
import { notifyMany } from "@/lib/notify";
import { standupStreak } from "@/lib/gamify";

const schema = z.object({
  finished: z.string().trim().max(2000).default(""),
  pending: z.string().trim().max(2000).default(""),
  obstacles: z.string().trim().max(2000).default(""),
});

// End-of-day stand-up: one per person per IST day; submitting again today replaces it.
export const POST = authed(async (req, u) => {
  const b = schema.parse(await req.json());
  if (!b.finished && !b.pending && !b.obstacles) throw new HttpError(400, "Write at least one line before submitting");
  const forDate = istDateKey();
  const row = await db.dailyUpdate.upsert({
    where: { userId_forDate: { userId: u.id, forDate } },
    update: b,
    create: { userId: u.id, forDate, ...b },
  });
  // An obstacle goes straight to the founders (in-app only, to keep inboxes quiet).
  if (b.obstacles) {
    const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
    await notifyMany(founders.map((f) => f.id), { kind: "BLOCKED", title: `${u.name} reported an obstacle`, body: b.obstacles.slice(0, 200), url: "/updates", email: false }, u.id);
  }
  const streak = await standupStreak(u.id);
  return NextResponse.json({ update: row, streak: streak.count });
});
