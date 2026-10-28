import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { dashboardData } from "@/lib/dashboard";
import { newSlug, snapshotLabel, type SnapshotPayload } from "@/lib/snapshots";
import { notifyMany } from "@/lib/notify";

// Founders publish a frozen copy of the company dashboard. The link works only for signed-in team members.
export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can publish a dashboard snapshot");
  const { period, emailTeam } = z.object({ period: z.enum(["week", "month"]), emailTeam: z.boolean().default(false) }).parse(await req.json());
  const data = await dashboardData(u, period);
  const payload: SnapshotPayload = { data, generatedAt: new Date().toISOString(), generatedBy: u.name, scope: "Whole company" };
  const label = snapshotLabel(period);
  const snap = await db.dashboardSnapshot.create({ data: { period: period === "week" ? "WEEKLY" : "MONTHLY", label, payload: JSON.stringify(payload), shareSlug: newSlug() } });
  await db.auditLog.create({ data: { actorId: u.id, action: "SNAPSHOT_PUBLISHED", target: snap.id, meta: label } });

  const team = await db.user.findMany({ where: { active: true }, select: { id: true } });
  await notifyMany(team.map((t) => t.id), { kind: "DIGEST", title: `Dashboard published: ${label}`, body: "See how the team did.", url: `/snapshots/${snap.shareSlug}`, email: emailTeam }, u.id);
  return NextResponse.json({ slug: snap.shareSlug, label }, { status: 201 });
});
