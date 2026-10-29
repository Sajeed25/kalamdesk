import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, storage } from "@/lib/storage";
import { HttpError, loadContributableTask } from "@/lib/tasks";
import { assertRealFile } from "@/lib/files";

export const POST = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  await loadContributableTask(u, params.id);
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file received");
  if (file.size === 0) throw new HttpError(400, "That file is empty");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Files must be 10 MB or smaller");
  if (!ALLOWED_MIME.has(file.type)) throw new HttpError(415, "Allowed: images, PDF, Word/Excel/PowerPoint, text/CSV");

  const bytes = Buffer.from(await file.arrayBuffer());
  assertRealFile(file.type, bytes);
  const key = `${params.id}/${randomUUID()}`;
  await storage.put(key, bytes);
  const a = await db.taskAttachment.create({
    data: { taskId: params.id, fileName: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 150), storageKey: key, mimeType: file.type, sizeBytes: file.size },
  });
  await db.taskActivity.create({ data: { taskId: params.id, actorId: u.id, action: "EDITED", detail: `Attached ${a.fileName}` } });
  return NextResponse.json({ attachment: a }, { status: 201 });
});
