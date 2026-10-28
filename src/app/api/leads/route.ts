import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { leadSchema } from "@/lib/leads";

// Anyone can log a lead; it belongs to the person who created it. Leads and founders see more (see /leads).
export const POST = authed(async (req, u) => {
  const b = leadSchema.parse(await req.json());
  const lead = await db.lead.create({ data: { ...b, stage: "NEW", ownerId: u.id } });
  await db.auditLog.create({ data: { actorId: u.id, action: "LEAD_CREATED", target: lead.id, meta: lead.name.slice(0, 80) } });
  return NextResponse.json({ id: lead.id }, { status: 201 });
});
