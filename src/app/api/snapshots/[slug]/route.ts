import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";

// Revoking deletes the snapshot, so its link stops working for everyone.
export const DELETE = authed<{ params: { slug: string } }>(async (_req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can remove a snapshot");
  const s = await db.dashboardSnapshot.findUnique({ where: { shareSlug: params.slug } });
  if (!s) throw new HttpError(404, "Snapshot not found");
  await db.dashboardSnapshot.delete({ where: { id: s.id } });
  await db.auditLog.create({ data: { actorId: u.id, action: "SNAPSHOT_REVOKED", target: s.id, meta: s.label } });
  return NextResponse.json({ ok: true });
});
