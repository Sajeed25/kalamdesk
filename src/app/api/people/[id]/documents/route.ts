import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { CryptoConfigError, cryptoConfigured, encryptBuffer } from "@/lib/crypto";
import { ALLOWED_MIME, storage } from "@/lib/storage";

const MAX = 8 * 1024 * 1024;
const kinds = z.enum(["OFFER_LETTER", "ID_PROOF", "CONTRACT", "OTHER"]);

// Founder-only. The file CONTENT is encrypted (AES-256-GCM, bound to the person) before it touches storage.
export const GET = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can access documents");
  const docs = await db.idDocument.findMany({ where: { userId: params.id }, orderBy: { createdAt: "desc" }, select: { id: true, kind: true, fileName: true, sizeBytes: true, createdAt: true } });
  return NextResponse.json({ documents: docs }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can upload documents");
  if (!cryptoConfigured()) throw new HttpError(503, "Encryption is not configured on the server (FIELD_ENCRYPTION_KEY), so documents cannot be stored.");
  const person = await db.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!person) throw new HttpError(404, "Person not found");

  const form = await req.formData();
  const file = form.get("file");
  const kind = kinds.safeParse(form.get("kind"));
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "No file received");
  if (!kind.success) throw new HttpError(400, "Choose what kind of document it is");
  if (file.size > MAX) throw new HttpError(413, "Documents must be 8 MB or smaller");
  if (!ALLOWED_MIME.has(file.type)) throw new HttpError(415, "Allowed: PDF, images, Word/Excel/PowerPoint, text");

  const key = `docs/${params.id}/${randomUUID()}`;
  try {
    await storage.put(key, encryptBuffer(Buffer.from(await file.arrayBuffer()), `${params.id}:doc:${key}`));
  } catch (e) {
    if (e instanceof CryptoConfigError) throw new HttpError(503, "Encryption is not configured on the server");
    throw e;
  }
  const doc = await db.idDocument.create({
    data: { userId: params.id, uploadedById: u.id, kind: kind.data, fileName: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 150), storageKey: key, mimeType: file.type, sizeBytes: file.size },
  });
  await db.auditLog.create({ data: { actorId: u.id, action: "DOCUMENT_UPLOADED", target: params.id, meta: `${kind.data} ${doc.fileName}` } });
  return NextResponse.json({ id: doc.id }, { status: 201 });
});
