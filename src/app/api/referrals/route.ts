import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { notifyMany } from "@/lib/notify";
import { programOpen, referralSchema } from "@/lib/referrals";

// Any signed-in person can refer. The referral's contact details are visible only to founders and the referrer.
export const POST = authed(async (req, u) => {
  const b = referralSchema.parse(await req.json());
  const program = await db.referralProgram.findUnique({ where: { id: b.programId } });
  if (!program || !programOpen(program)) throw new HttpError(400, "This referral program is not open");
  const ref = await db.referral.create({ data: { programId: b.programId, referrerId: u.id, name: b.name, contact: b.contact, organisation: b.organisation || null, notes: b.notes } });
  const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
  await notifyMany(founders.map((f) => f.id), { kind: "ASSIGNED", title: `New referral from ${u.name}: ${b.name}`, body: program.name, url: "/referrals", email: false }, u.id);
  return NextResponse.json({ referral: { id: ref.id } }, { status: 201 });
});
