import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { storage } from "@/lib/storage";
import { decisionSchema, inr } from "@/lib/expenses";
import { notify } from "@/lib/notify";

// Founders decide: approve / reject, then mark paid once the money has gone out.
export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can decide on expense claims");
  const b = decisionSchema.parse(await req.json());
  const c = await db.expenseClaim.findUnique({ where: { id: params.id } });
  if (!c) throw new HttpError(404, "Claim not found");
  if (c.userId === u.id && (await db.user.count({ where: { role: "FOUNDER", active: true } })) > 1) throw new HttpError(403, "You can't decide on your own claim. Ask the other founder.");
  if (b.action === "PAID" ? c.status !== "APPROVED" : c.status !== "SUBMITTED") throw new HttpError(409, b.action === "PAID" ? "Approve it first" : "This claim has already been decided");
  if (b.action === "REJECT" && b.note.length < 3) throw new HttpError(400, "Say briefly why, so they can fix it");

  const now = new Date();
  const data = b.action === "APPROVE" ? { status: "APPROVED", decidedById: u.id, decidedAt: now, decisionNote: b.note || null }
    : b.action === "REJECT" ? { status: "REJECTED", decidedById: u.id, decidedAt: now, decisionNote: b.note }
    : { status: "PAID", paidAt: now };
  await db.expenseClaim.update({ where: { id: c.id }, data });
  await db.auditLog.create({ data: { actorId: u.id, action: `EXPENSE_${b.action === "PAID" ? "PAID" : b.action === "APPROVE" ? "APPROVED" : "REJECTED"}`, target: c.userId, meta: `${inr(c.amountInr)} ${c.title}`.slice(0, 120) } });
  const word = b.action === "APPROVE" ? "approved" : b.action === "REJECT" ? "rejected" : "paid";
  await notify({ userId: c.userId, kind: "STATUS", title: `Your ${inr(c.amountInr)} claim was ${word}`, body: `${c.title}${b.note ? `: ${b.note}` : ""}`, url: "/expenses" });
  return NextResponse.json({ ok: true });
});

// The person can withdraw a claim nobody has decided yet.
export const DELETE = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  const c = await db.expenseClaim.findUnique({ where: { id: params.id } });
  if (!c || c.userId !== u.id) throw new HttpError(404, "Claim not found");
  if (c.status !== "SUBMITTED") throw new HttpError(409, "Only claims nobody has decided yet can be withdrawn");
  await db.expenseClaim.delete({ where: { id: c.id } });
  if (c.receiptKey) await storage.remove(c.receiptKey);
  return NextResponse.json({ ok: true });
});
