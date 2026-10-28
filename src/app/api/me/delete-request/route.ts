import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { notifyMany } from "@/lib/notify";

// DPDP Act: a person can ask for their data to be corrected or deleted. This records the request and tells the
// founders, who act on it (the app never deletes anyone's records automatically).
export const POST = authed(async (req, u) => {
  const b = z.object({ kind: z.enum(["CORRECT", "DELETE"]), details: z.string().trim().min(5, "Tell us a little more").max(500) }).parse(await req.json());
  await db.auditLog.create({ data: { actorId: u.id, action: b.kind === "DELETE" ? "DATA_DELETION_REQUESTED" : "DATA_CORRECTION_REQUESTED", target: u.id, meta: b.details } });
  const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
  await notifyMany(founders.map((f) => f.id), { kind: "REMINDER", title: `${u.name} sent a data ${b.kind === "DELETE" ? "deletion" : "correction"} request`, body: b.details.slice(0, 200), url: `/people/${u.id}` }, u.id);
  return NextResponse.json({ ok: true }, { status: 201 });
});
