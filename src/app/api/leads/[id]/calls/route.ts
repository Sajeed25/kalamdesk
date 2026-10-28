import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { callSchema } from "@/lib/leads";
import { leadWhere } from "@/lib/leadScope";

// Log one call. Optionally set the next follow-up; a "connected" call on a NEW lead moves it to CONTACTED.
export const POST = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const lead = await db.lead.findFirst({ where: { AND: [{ id: params.id }, await leadWhere(u)] } });
  if (!lead) throw new HttpError(404, "Lead not found");
  const b = callSchema.parse(await req.json());
  await db.leadCall.create({ data: { leadId: lead.id, userId: u.id, outcome: b.outcome, note: b.note } });
  const data: Record<string, unknown> = {};
  if (b.nextFollowUp) data.nextFollowUp = new Date(b.nextFollowUp);
  else if (b.outcome === "NOT_INTERESTED" || b.outcome === "WRONG_NUMBER") data.nextFollowUp = null;
  if (lead.stage === "NEW" && b.outcome !== "WRONG_NUMBER") data.stage = "CONTACTED";
  if (Object.keys(data).length) await db.lead.update({ where: { id: lead.id }, data });
  return NextResponse.json({ ok: true }, { status: 201 });
});
