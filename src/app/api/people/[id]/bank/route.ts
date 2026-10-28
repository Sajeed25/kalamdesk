import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { bankSchema } from "@/lib/bankSchema";
import { CryptoConfigError, cryptoConfigured, encryptField } from "@/lib/crypto";

const NO_STORE = { "Cache-Control": "no-store" };

// Everything here is founder-only, enforced on the server. Managers get 403 even if they call the API directly.
function founderOnly(u: { role: string }) {
  if (!isFounder(u as never)) throw new HttpError(403, "Only founders can access bank and ID details");
}

// Masked view: presence flags and the last 4 digits of the account only. No decryption happens here.
export const GET = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  founderOnly(u);
  const row = await db.employeeSensitive.findUnique({ where: { userId: params.id } });
  return NextResponse.json(
    {
      encryptionReady: cryptoConfigured(),
      saved: !!row,
      account: row?.last4 ? `••••••••${row.last4}` : null,
      has: {
        accountHolder: !!row?.accountHolderEnc, accountNumber: !!row?.accountNumberEnc, ifsc: !!row?.ifscEnc,
        bankName: !!row?.bankNameEnc, upiId: !!row?.upiIdEnc, idNumber: !!row?.idNumberEnc,
      },
      idType: row?.idType ?? null,
      updatedAt: row?.updatedAt ?? null,
    },
    { headers: NO_STORE }
  );
});

export const PUT = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  founderOnly(u);
  if (!cryptoConfigured()) throw new HttpError(503, "Encryption is not configured on the server (FIELD_ENCRYPTION_KEY), so nothing can be saved.");
  const person = await db.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!person) throw new HttpError(404, "Person not found");
  const b = bankSchema.parse(await req.json());

  const enc = (field: string, v: string) => encryptField(v, `${params.id}:${field}`);
  const data: Record<string, string | null> = {};
  const touched: string[] = [];
  const set = (col: string, field: string, v: string | undefined) => {
    if (v !== undefined) { data[col] = enc(field, v); touched.push(field); }
  };
  set("accountHolderEnc", "accountHolder", b.accountHolder);
  set("accountNumberEnc", "accountNumber", b.accountNumber);
  set("ifscEnc", "ifsc", b.ifsc);
  set("bankNameEnc", "bankName", b.bankName);
  set("upiIdEnc", "upiId", b.upiId);
  set("idNumberEnc", "idNumber", b.idNumber);
  if (b.accountNumber) data.last4 = b.accountNumber.slice(-4);
  if (b.idType) { data.idType = b.idType; touched.push("idType"); }

  const clearCols: Record<string, string> = { accountHolder: "accountHolderEnc", accountNumber: "accountNumberEnc", ifsc: "ifscEnc", bankName: "bankNameEnc", upiId: "upiIdEnc", idNumber: "idNumberEnc" };
  for (const f of b.clear) {
    data[clearCols[f]] = null;
    if (f === "accountNumber") data.last4 = null;
    if (f === "idNumber") data.idType = null;
    touched.push(`cleared:${f}`);
  }
  if (touched.length === 0) throw new HttpError(400, "Nothing to save");

  try {
    await db.employeeSensitive.upsert({ where: { userId: params.id }, update: data, create: { userId: params.id, ...data } });
  } catch (e) {
    if (e instanceof CryptoConfigError) throw new HttpError(503, "Encryption is not configured on the server");
    throw e;
  }
  // Audit records which fields changed, never their values.
  await db.auditLog.create({ data: { actorId: u.id, action: "BANK_UPDATED", target: params.id, meta: touched.join(",") } });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
});
