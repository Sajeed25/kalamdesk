import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { setGoal, TEAM_KEY, TEAM_MAX, TEAM_MIN } from "@/lib/goals";

// The company's weekly challenge: how many tasks the whole team completes. `null` = automatic.
export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can set the team challenge");
  const { tasks } = z.object({ tasks: z.number().int().min(TEAM_MIN).max(TEAM_MAX).nullable() }).parse(await req.json());
  await setGoal(TEAM_KEY, tasks);
  await db.auditLog.create({ data: { actorId: u.id, action: "TEAM_GOAL_SET", target: "team", meta: tasks === null ? "automatic" : String(tasks) } });
  return NextResponse.json({ ok: true });
});
