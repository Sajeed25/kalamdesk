import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";

// Optional and personal: only day and month are stored (no birth year), and only so the team can cheer the day.
const schema = z.object({ birthday: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Use MM-DD").nullable() }).refine(
  (b) => { if (b.birthday === null) return true; const [m, d] = b.birthday.split("-").map(Number); return d <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }, { message: "Not a real date" });

export const PUT = authed(async (req, u) => {
  const { birthday } = schema.parse(await req.json());
  if (birthday === null) await db.personDate.deleteMany({ where: { userId: u.id } });
  else await db.personDate.upsert({ where: { userId: u.id }, update: { birthday }, create: { userId: u.id, birthday } });
  return NextResponse.json({ ok: true });
});
