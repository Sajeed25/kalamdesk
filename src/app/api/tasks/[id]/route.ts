import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { patchSchema, updateTask } from "@/lib/tasks";

export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const input = patchSchema.parse(await req.json());
  const task = await updateTask(u, params.id, input);
  // Lets the UI celebrate: the points this person currently holds for the task (0 unless it is Done).
  let points = 0;
  if (task.status === "DONE") {
    const s = await db.scoreEvent.aggregate({ where: { taskId: task.id, userId: u.id }, _sum: { points: true } });
    points = s._sum.points ?? 0;
  }
  return NextResponse.json({ task, points });
});
