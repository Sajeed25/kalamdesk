import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { fileResponse } from "@/lib/files";
import { HttpError, loadContributableTask, visibleWhere } from "@/lib/tasks";

// Open or download: anyone who can see the task. Photos and PDFs open in the browser; other files download.
export const GET = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const a = await db.taskAttachment.findUnique({ where: { id: params.id } });
  const visible = a && (await db.task.findFirst({ where: { AND: [{ id: a.taskId }, await visibleWhere(u)] }, select: { id: true } }));
  if (!a || !visible) throw new HttpError(404, "Not found");
  const data = await storage.get(a.storageKey).catch(() => null);
  if (!data) throw new HttpError(404, "File is missing from storage");
  return fileResponse(data, a.fileName, a.mimeType, new URL(req.url).searchParams.get("download") === "1");
});

export const DELETE = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  const a = await db.taskAttachment.findUnique({ where: { id: params.id } });
  if (!a) throw new HttpError(404, "Not found");
  await loadContributableTask(u, a.taskId);
  await db.taskAttachment.delete({ where: { id: a.id } });
  await storage.remove(a.storageKey);
  return NextResponse.json({ ok: true });
});
