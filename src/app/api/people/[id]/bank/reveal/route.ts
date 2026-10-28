import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { requireRecentReauth } from "@/lib/reauth";
import { CryptoConfigError, decryptField } from "@/lib/crypto";

const LIMIT_PER_HOUR = 20;

// Full values: founder only, only within 5 minutes of re-entering the password, and every reveal is audited.
export const POST = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can reveal bank and ID details");
  await requireRecentReauth(u.id);

  const recent = await db.auditLog.count({ where: { actorId: u.id, action: "SENSITIVE_REVEAL", createdAt: { gte: new Date(Date.now() - 3600 * 1000) } } });
  if (recent >= LIMIT_PER_HOUR) throw new HttpError(429, "Reveal limit reached for this hour");

  const row = await db.employeeSensitive.findUnique({ where: { userId: params.id } });
  if (!row) throw new HttpError(404, "No bank details saved for this person");

  const dec = (col: string | null, field: string) => (col ? decryptField(col, `${params.id}:${field}`) : null);
  let out;
  try {
    out = {
      accountHolder: dec(row.accountHolderEnc, "accountHolder"), accountNumber: dec(row.accountNumberEnc, "accountNumber"),
      ifsc: dec(row.ifscEnc, "ifsc"), bankName: dec(row.bankNameEnc, "bankName"), upiId: dec(row.upiIdEnc, "upiId"),
      idType: row.idType, idNumber: dec(row.idNumberEnc, "idNumber"),
    };
  } catch (e) {
    if (e instanceof CryptoConfigError) throw new HttpError(503, "Encryption is not configured on the server");
    // Wrong key or tampered data. Do not echo details.
    throw new HttpError(500, "These details could not be decrypted. Was the encryption key changed?");
  }
  await db.auditLog.create({ data: { actorId: u.id, action: "SENSITIVE_REVEAL", target: params.id, meta: "bank+id" } });
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
});
