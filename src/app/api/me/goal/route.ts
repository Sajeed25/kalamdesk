import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { personalKey, PERSONAL_MAX, PERSONAL_MIN, setGoal } from "@/lib/goals";

// Your own weekly task goal. `null` goes back to the automatic goal that adapts to your recent weeks.
export const POST = authed(async (req, u) => {
  const { tasks } = z.object({ tasks: z.number().int().min(PERSONAL_MIN).max(PERSONAL_MAX).nullable() }).parse(await req.json());
  await setGoal(personalKey(u.id), tasks);
  return NextResponse.json({ ok: true });
});
