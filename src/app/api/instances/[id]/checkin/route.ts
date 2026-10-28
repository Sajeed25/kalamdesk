import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";

// Field-visit check-in. Server stamps the time (never trusts the device clock). GPS is optional.
export const POST = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const b = z
    .object({ lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() })
    .parse(await req.json().catch(() => ({})));
  const inst = await db.taskInstance.findUnique({ where: { id: params.id }, include: { task: { include: { assignees: true } } } });
  if (!inst || !inst.task.assignees.some((a) => a.userId === u.id)) throw new HttpError(404, "Not found");
  if (inst.checkInAt) throw new HttpError(409, "Already checked in");
  if (inst.outcome === "MISSED") throw new HttpError(400, "This activity is closed (missed)");

  const now = new Date();
  await db.taskInstance.update({ where: { id: inst.id }, data: { checkInAt: now, checkInLat: b.lat ?? null, checkInLng: b.lng ?? null } });
  await db.taskActivity.create({ data: { taskId: inst.taskId, actorId: u.id, action: "EDITED", detail: b.lat !== undefined ? "Checked in (with location)" : "Checked in" } });
  return NextResponse.json({ checkInAt: now.toISOString() });
});
