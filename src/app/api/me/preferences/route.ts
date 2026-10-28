import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { normalizePhone } from "@/lib/whatsapp";

// Personal notification preferences. WhatsApp alerts are opt-in: nothing is sent unless the person turns it on
// here for a valid mobile number, and the consent is recorded in the audit log.
export const PATCH = authed(async (req, u) => {
  const b = z.object({ whatsappOptIn: z.boolean().optional(), phone: z.string().trim().max(30).optional() }).parse(await req.json());
  const current = await db.employeeProfile.findUnique({ where: { userId: u.id } });
  const phone = b.phone !== undefined && b.phone !== "" ? normalizePhone(b.phone) : null;
  if (b.phone && !phone) throw new HttpError(400, "Enter a valid Indian mobile number, like 98765 43210");

  const data: { phone?: string; whatsappOptIn?: boolean } = {};
  if (phone) data.phone = `+${phone.slice(0, 2)} ${phone.slice(2, 7)} ${phone.slice(7)}`;
  if (b.whatsappOptIn !== undefined) {
    if (b.whatsappOptIn && !(phone ?? normalizePhone(current?.phone))) throw new HttpError(400, "Add your mobile number first");
    data.whatsappOptIn = b.whatsappOptIn;
  }
  if (Object.keys(data).length === 0) throw new HttpError(400, "Nothing to change");

  await db.employeeProfile.upsert({ where: { userId: u.id }, update: data, create: { userId: u.id, ...data } });
  if (b.whatsappOptIn !== undefined)
    await db.auditLog.create({ data: { actorId: u.id, action: b.whatsappOptIn ? "WHATSAPP_OPT_IN" : "WHATSAPP_OPT_OUT", target: u.id } });
  return NextResponse.json({ ok: true });
});
