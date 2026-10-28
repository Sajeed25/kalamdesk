import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, loadContributableTask } from "@/lib/tasks";

export const POST = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  await loadContributableTask(u, params.id);
  const { text } = z.object({ text: z.string().trim().min(1).max(200) }).parse(await req.json());
  const last = await db.taskChecklistItem.findFirst({ where: { taskId: params.id }, orderBy: { position: "desc" } });
  const item = await db.taskChecklistItem.create({ data: { taskId: params.id, text, position: (last?.position ?? -1) + 1 } });
  return NextResponse.json({ item }, { status: 201 });
});

// Toggle done, or delete, one item: { itemId, done } / { itemId, remove: true }
export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  await loadContributableTask(u, params.id);
  const b = z.object({ itemId: z.string(), done: z.boolean().optional(), remove: z.boolean().optional() }).parse(await req.json());
  const item = await db.taskChecklistItem.findFirst({ where: { id: b.itemId, taskId: params.id } });
  if (!item) throw new HttpError(404, "Item not found");
  if (b.remove) await db.taskChecklistItem.delete({ where: { id: item.id } });
  else if (b.done !== undefined) await db.taskChecklistItem.update({ where: { id: item.id }, data: { done: b.done } });
  return NextResponse.json({ ok: true });
});
