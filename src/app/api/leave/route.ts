import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { LEAVE_LABEL, daysBetween, leaveSchema } from "@/lib/leave";
import { notifyMany } from "@/lib/notify";

// Ask for leave. The reporting manager and the founders are told; the cover person is named up front.
export const POST = authed(async (req, u) => {
  const b = leaveSchema.parse(await req.json());
  if (b.toDate < b.fromDate) throw new HttpError(400, "The last day can't be before the first day");
  const days = daysBetween(b.fromDate, b.toDate);
  if (days > 60) throw new HttpError(400, "Leave longer than 60 days needs a conversation with a founder");
  const backupId = b.backupUserId || null;
  if (backupId) {
    if (backupId === u.id) throw new HttpError(400, "Choose someone else to cover for you");
    if (!(await db.user.findFirst({ where: { id: backupId, active: true }, select: { id: true } }))) throw new HttpError(400, "Unknown cover person");
  }
  const clash = await db.leaveRequest.findFirst({ where: { userId: u.id, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: b.toDate }, toDate: { gte: b.fromDate } } });
  if (clash) throw new HttpError(409, "You already have leave that overlaps these dates");

  const row = await db.leaveRequest.create({ data: { userId: u.id, type: b.type, fromDate: b.fromDate, toDate: b.toDate, days, reason: b.reason, backupUserId: backupId } });
  const profile = await db.employeeProfile.findUnique({ where: { userId: u.id }, select: { managerId: true } });
  const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
  const approvers = Array.from(new Set([...(profile?.managerId ? [profile.managerId] : []), ...founders.map((f) => f.id)]));
  await notifyMany(approvers, { kind: "STATUS", title: `Leave request: ${u.name}`, body: `${LEAVE_LABEL[b.type]} leave, ${b.fromDate}${days > 1 ? ` to ${b.toDate}` : ""} (${days} day${days > 1 ? "s" : ""}).`, url: "/leave" }, u.id);
  return NextResponse.json({ id: row.id, days }, { status: 201 });
});
