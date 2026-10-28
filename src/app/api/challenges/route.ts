import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { METRIC_LABEL, challengeSchema } from "@/lib/challenges";
import { notifyMany } from "@/lib/notify";

// Founders create seasonal challenges ("Diwali sprint: 100 school visits"). Everyone gets a note in the app.
export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can create challenges");
  const b = challengeSchema.parse(await req.json());
  if ((await db.challenge.count({ where: { active: true } })) >= 20) throw new HttpError(409, "Too many active challenges. End one first.");
  const c = await db.challenge.create({ data: { ...b, createdById: u.id } });
  await db.auditLog.create({ data: { actorId: u.id, action: "CHALLENGE_CREATED", target: c.id, meta: c.title.slice(0, 80) } });
  const everyone = await db.user.findMany({ where: { active: true, role: { not: "FOUNDER" } }, select: { id: true } });
  await notifyMany(everyone.map((p) => p.id), { kind: "STATUS", title: `New challenge: ${c.title}`, body: `${c.target} ${METRIC_LABEL[c.metric]} between ${c.startsOn} and ${c.endsOn}.${c.prize ? ` Prize: ${c.prize}` : ""}`, url: "/challenges", email: false }, u.id);
  return NextResponse.json({ id: c.id }, { status: 201 });
});
