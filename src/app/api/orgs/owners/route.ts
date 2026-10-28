import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { dbRaw } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { requireOwner } from "@/lib/orgs";

// A group owner can make another founder a group owner too (or take it away). Group owners can open every organisation.
export const POST = authed(async (req, u) => {
  requireOwner(u);
  const { userId, allOrgs } = z.object({ userId: z.string().min(1), allOrgs: z.boolean() }).parse(await req.json());
  const target = await dbRaw.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "FOUNDER") throw new HttpError(404, "Only founders can be group owners");
  if (!allOrgs && target.id === u.id) throw new HttpError(400, "You can't remove your own access. Ask another group owner.");
  if (!allOrgs && (await dbRaw.user.count({ where: { allOrgs: true, active: true } })) <= 1) throw new HttpError(400, "There must be at least one group owner");
  await dbRaw.user.update({ where: { id: target.id }, data: { allOrgs } });
  await dbRaw.auditLog.create({ data: { actorId: u.id, orgId: target.orgId, action: allOrgs ? "GROUP_OWNER_GRANTED" : "GROUP_OWNER_REMOVED", target: target.id, meta: target.email } });
  return NextResponse.json({ ok: true });
});
