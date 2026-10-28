import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";

export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can change challenges");
  const b = z.object({ active: z.boolean() }).parse(await req.json());
  const r = await db.challenge.updateMany({ where: { id: params.id }, data: { active: b.active } });
  if (r.count === 0) throw new HttpError(404, "Challenge not found");
  return NextResponse.json({ ok: true });
});

export const DELETE = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can delete challenges");
  const r = await db.challenge.deleteMany({ where: { id: params.id } });
  if (r.count === 0) throw new HttpError(404, "Challenge not found");
  await db.auditLog.create({ data: { actorId: u.id, action: "CHALLENGE_DELETED", target: params.id } });
  return NextResponse.json({ ok: true });
});
