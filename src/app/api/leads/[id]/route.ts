import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { leadPatchSchema, STAGE_LABEL } from "@/lib/leads";
import { leadWhere } from "@/lib/leadScope";
import { notifyMany } from "@/lib/notify";

async function load(u: Parameters<typeof leadWhere>[0], id: string) {
  const lead = await db.lead.findFirst({ where: { AND: [{ id }, await leadWhere(u)] } });
  if (!lead) throw new HttpError(404, "Lead not found");
  return lead;
}

export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const lead = await load(u, params.id);
  const b = leadPatchSchema.parse(await req.json());
  if (b.ownerId && b.ownerId !== lead.ownerId) {
    if (!isLead(u)) throw new HttpError(403, "Only founders and managers can hand a lead to someone else");
    if (!(await db.user.findFirst({ where: { id: b.ownerId, active: true }, select: { id: true } }))) throw new HttpError(400, "Unknown person");
  }
  const data: Record<string, unknown> = {};
  for (const k of ["stage", "notes", "valueInr", "ownerId", "phone", "organisation"] as const) if (b[k] !== undefined) data[k] = b[k];
  if (b.nextFollowUp !== undefined) data.nextFollowUp = b.nextFollowUp ? new Date(b.nextFollowUp) : null;
  if (b.stage === "WON" || b.stage === "LOST") data.nextFollowUp = null;
  const updated = await db.lead.update({ where: { id: lead.id }, data });
  await db.auditLog.create({ data: { actorId: u.id, action: "LEAD_UPDATED", target: lead.id, meta: Object.keys(data).join(",").slice(0, 100) } });
  if (b.stage && b.stage !== lead.stage && (b.stage === "WON" || b.stage === "PROPOSAL")) {
    const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
    await notifyMany(founders.map((f) => f.id), { kind: "STATUS", title: `${b.stage === "WON" ? "🎉 Deal won" : "Proposal stage"}: ${lead.name}`, body: `${u.name} moved this lead to ${STAGE_LABEL[b.stage]}.`, url: "/leads", email: b.stage === "WON" }, u.id);
  }
  if (b.ownerId && b.ownerId !== lead.ownerId && b.ownerId !== u.id) {
    await notifyMany([b.ownerId], { kind: "ASSIGNED", title: `New lead for you: ${lead.name}`, body: `${u.name} handed you this lead.`, url: "/leads" }, u.id);
  }
  return NextResponse.json({ lead: { id: updated.id, stage: updated.stage } });
});

export const DELETE = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  const lead = await load(u, params.id);
  if (!isLead(u) && lead.ownerId !== u.id) throw new HttpError(403, "Not allowed");
  await db.lead.delete({ where: { id: lead.id } });
  await db.auditLog.create({ data: { actorId: u.id, action: "LEAD_DELETED", target: lead.id, meta: lead.name.slice(0, 80) } });
  return NextResponse.json({ ok: true });
});
