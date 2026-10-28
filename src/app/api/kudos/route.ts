import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { notify } from "@/lib/notify";
import { startOfIstDay } from "@/lib/time";

const DAILY_LIMIT = 10;

// A quick public high-five. The recipient gets an in-app notification (never an email), and it appears on
// the Challenges kudos wall. The audit row is the record of who gave it; it also feeds the Team Player badge.
export const POST = authed(async (req, u) => {
  const b = z.object({ toUserId: z.string(), message: z.string().trim().min(3, "Say a few words").max(140, "Keep it under 140 characters") }).parse(await req.json());
  if (b.toUserId === u.id) throw new HttpError(400, "You can't give kudos to yourself (nice try!)");
  const to = await db.user.findFirst({ where: { id: b.toUserId, active: true }, select: { id: true, name: true } });
  if (!to) throw new HttpError(404, "That person was not found");
  const today = await db.auditLog.count({ where: { actorId: u.id, action: "KUDOS_SENT", createdAt: { gte: startOfIstDay() } } });
  if (today >= DAILY_LIMIT) throw new HttpError(429, `That's ${DAILY_LIMIT} kudos today. Save some for tomorrow!`);

  await db.auditLog.create({ data: { actorId: u.id, action: "KUDOS_SENT", target: to.id, meta: b.message } });
  await notify({ userId: to.id, kind: "KUDOS", title: `🙌 ${u.name} gave you kudos`, body: b.message, url: "/challenges", email: false });
  return NextResponse.json({ ok: true, to: to.name }, { status: 201 });
});
