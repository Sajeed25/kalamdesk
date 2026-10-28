import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { requireRecentReauth } from "@/lib/reauth";
import { CryptoConfigError, decryptBuffer } from "@/lib/crypto";
import { storage } from "@/lib/storage";

// Download = decrypt on the fly. Founder only, only within 5 minutes of re-entering the password (+ code), audited.
export const GET = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can open documents");
  await requireRecentReauth(u.id);
  const doc = await db.idDocument.findUnique({ where: { id: params.id } });
  if (!doc) throw new HttpError(404, "Document not found");
  const recent = await db.auditLog.count({ where: { actorId: u.id, action: "DOCUMENT_OPENED", createdAt: { gte: new Date(Date.now() - 3600 * 1000) } } });
  if (recent >= 30) throw new HttpError(429, "Download limit reached for this hour");

  const blob = await storage.get(doc.storageKey).catch(() => null);
  if (!blob) throw new HttpError(404, "The file is missing from storage");
  let plain: Buffer;
  try {
    plain = decryptBuffer(blob, `${doc.userId}:doc:${doc.storageKey}`);
  } catch (e) {
    if (e instanceof CryptoConfigError) throw new HttpError(503, "Encryption is not configured on the server");
    throw new HttpError(500, "This document could not be decrypted. Was the encryption key changed?");
  }
  await db.auditLog.create({ data: { actorId: u.id, action: "DOCUMENT_OPENED", target: doc.userId, meta: `${doc.kind} ${doc.fileName}` } });
  return new Response(new Uint8Array(plain), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});

export const DELETE = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can remove documents");
  const doc = await db.idDocument.findUnique({ where: { id: params.id } });
  if (!doc) throw new HttpError(404, "Document not found");
  await db.idDocument.delete({ where: { id: doc.id } });
  await storage.remove(doc.storageKey);
  await db.auditLog.create({ data: { actorId: u.id, action: "DOCUMENT_DELETED", target: doc.userId, meta: `${doc.kind} ${doc.fileName}` } });
  return NextResponse.json({ ok: true });
});
