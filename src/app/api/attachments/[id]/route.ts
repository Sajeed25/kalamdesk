import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { HttpError, loadContributableTask, visibleWhere } from "@/lib/tasks";

// Download: anyone who can see the task. Always sent as an attachment with nosniff so uploads can't run as pages.
export const GET = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  const a = await db.taskAttachment.findUnique({ where: { id: params.id } });
  const visible = a && (await db.task.findFirst({ where: { AND: [{ id: a.taskId }, await visibleWhere(u)] }, select: { id: true } }));
  if (!a || !visible) throw new HttpError(404, "Not found");
  const data = await storage.get(a.storageKey).catch(() => null);
  if (!data) throw new HttpError(404, "File is missing from storage");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(a.fileName)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});

export const DELETE = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  const a = await db.taskAttachment.findUnique({ where: { id: params.id } });
  if (!a) throw new HttpError(404, "Not found");
  await loadContributableTask(u, a.taskId);
  await db.taskAttachment.delete({ where: { id: a.id } });
  await storage.remove(a.storageKey);
  return NextResponse.json({ ok: true });
});
