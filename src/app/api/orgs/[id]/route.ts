import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { dbRaw } from "@/lib/db";
import { orgSchema, requireOwner } from "@/lib/orgs";
import { HttpError } from "@/lib/tasks";

// Rename, recolour or archive an organisation. Archiving hides it from the switcher and stops its scheduled emails;
// nothing is deleted and it can be restored.
export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  requireOwner(u);
  const b = orgSchema.partial().extend({ active: z.boolean().optional() }).parse(await req.json());
  const org = await dbRaw.organization.findUnique({ where: { id: params.id } });
  if (!org) throw new HttpError(404, "Not found");
  if (b.active === false) {
    if (org.id === u.homeOrgId) throw new HttpError(400, "That's your home organisation, so it can't be archived");
    if ((await dbRaw.organization.count({ where: { active: true } })) <= 1) throw new HttpError(400, "Keep at least one active organisation");
  }
  if (b.name && b.name !== org.name && (await dbRaw.organization.findUnique({ where: { name: b.name } }))) throw new HttpError(409, "An organisation with that name already exists");
  await dbRaw.organization.update({ where: { id: org.id }, data: b });
  await dbRaw.auditLog.create({ data: { actorId: u.id, orgId: org.id, action: b.active === undefined ? "ORG_EDITED" : b.active ? "ORG_RESTORED" : "ORG_ARCHIVED", target: org.id, meta: org.name } });
  return NextResponse.json({ ok: true });
});
