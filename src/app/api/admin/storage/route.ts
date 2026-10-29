import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { dbRaw } from "@/lib/db";
import { requireOwner } from "@/lib/orgs";
import { HttpError } from "@/lib/httpError";
import { biggestTables, cleanup, runApproved, setAutoRotate, storageState } from "@/lib/storageMaintenance";

// Database storage: group owners only (the database is shared by every organisation).

/** Usage, the biggest tables, and a dry-run of exactly what an approved clean-up would remove. Nothing is deleted here. */
export const GET = authed(async (_req, u) => {
  requireOwner(u);
  const state = await storageState(true);
  const [tables, junk, auto] = await Promise.all([biggestTables(), cleanup("junk", true), cleanup("auto", true)]);
  return NextResponse.json({ ...state, tables, previewJunk: junk.steps, previewAuto: auto.steps });
});

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }), // approve the full clean-up of the oldest data
  z.object({ action: z.literal("junk") }), // only the harmless housekeeping
  z.object({ action: z.literal("auto"), on: z.boolean() }), // standing approval (Auto-rotate)
]);

export const POST = authed(async (req, u) => {
  requireOwner(u);
  const b = body.parse(await req.json());
  if (b.action === "auto") {
    await setAutoRotate(b.on);
    await dbRaw.auditLog.create({ data: { actorId: u.id, orgId: u.orgId, action: b.on ? "STORAGE_AUTOROTATE_ON" : "STORAGE_AUTOROTATE_OFF", target: "database" } });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "junk") {
    const res = await cleanup("junk");
    await dbRaw.auditLog.create({ data: { actorId: u.id, orgId: u.orgId, action: "STORAGE_JUNK_CLEANED", target: "database", meta: `${res.steps.reduce((s, x) => s + x.rows, 0)} items` } });
    return NextResponse.json({ ok: true, result: res });
  }
  const state = await storageState(true);
  if (state.level === "ok") throw new HttpError(409, "Storage is below 80%, so only the harmless housekeeping is available.");
  const res = await runApproved({ id: u.id, name: u.name, orgId: u.orgId }, "approved");
  return NextResponse.json({ ok: true, result: res });
});
