import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { storage } from "@/lib/storage";
import { assertRealFile } from "@/lib/files";
import { MAX_RECEIPT, RECEIPT_MIME, expenseSchema, inr } from "@/lib/expenses";
import { notifyMany } from "@/lib/notify";
import { istDateKey } from "@/lib/time";

// Submit a claim (multipart so a photo of the receipt can ride along). Founders are told straight away.
export const POST = authed(async (req, u) => {
  const form = await req.formData();
  const b = expenseSchema.parse({ title: form.get("title"), category: form.get("category"), amountInr: form.get("amountInr"), spentOn: form.get("spentOn"), notes: form.get("notes") ?? "" });
  if (b.spentOn > istDateKey()) throw new HttpError(400, "The date can't be in the future");
  const file = form.get("receipt");
  let receipt: { receiptKey: string; receiptName: string; receiptMime: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_RECEIPT) throw new HttpError(413, "The receipt must be 5 MB or smaller");
    if (!RECEIPT_MIME.has(file.type)) throw new HttpError(415, "Receipt must be a photo (JPG, PNG, WebP) or a PDF");
    const key = `receipts/${u.id}/${randomUUID()}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    assertRealFile(file.type, bytes);
    await storage.put(key, bytes);
    receipt = { receiptKey: key, receiptName: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 150), receiptMime: file.type };
  }
  const claim = await db.expenseClaim.create({ data: { ...b, userId: u.id, ...(receipt ?? {}) } });
  const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
  await notifyMany(founders.map((f) => f.id), { kind: "STATUS", title: `Expense claim: ${inr(claim.amountInr)} from ${u.name}`, body: `${claim.title} (${claim.category.toLowerCase()})`, url: "/expenses", email: false }, u.id);
  return NextResponse.json({ id: claim.id }, { status: 201 });
});
