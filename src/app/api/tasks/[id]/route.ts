import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { patchSchema, updateTask } from "@/lib/tasks";

export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const input = patchSchema.parse(await req.json());
  const task = await updateTask(u, params.id, input);
  return NextResponse.json({ task });
});
