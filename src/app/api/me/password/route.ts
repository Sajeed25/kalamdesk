import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { dbRaw as db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { HttpError } from "@/lib/tasks";

export const POST = authed(async (req, u) => {
  const { current, next } = z.object({ current: z.string(), next: z.string().min(8).max(100) }).parse(await req.json());
  const row = await db.user.findUnique({ where: { id: u.id } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) throw new HttpError(400, "Current password is wrong");
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(next) } });
  await db.auditLog.create({ data: { actorId: u.id, action: "PASSWORD_CHANGED", target: u.id } });
  return NextResponse.json({ ok: true });
});
