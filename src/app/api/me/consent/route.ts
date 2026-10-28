import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";

// DPDP Act 2023: record the user's consent to processing for the stated purposes.
export const POST = authed(async (_req, u) => {
  await db.user.update({ where: { id: u.id }, data: { consentAt: new Date() } });
  await db.auditLog.create({ data: { actorId: u.id, action: "CONSENT_GIVEN", target: u.id } });
  return NextResponse.json({ ok: true });
});
