import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { DEFAULTS, getSettings, resetSettings, saveSettings } from "@/lib/scoring";

export const GET = authed(async () => NextResponse.json({ settings: await getSettings(), defaults: DEFAULTS }));

// Changing weights affects points earned from now on; past events keep the breakdown they were scored with.
export const PUT = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can change scoring weights");
  const values = z.record(z.string(), z.number().min(0).max(1000)).parse(await req.json());
  const unknown = Object.keys(values).filter((k) => !(k in DEFAULTS));
  if (unknown.length) throw new HttpError(400, `Unknown setting: ${unknown[0]}`);
  for (const [k, v] of Object.entries(values)) {
    if ((k.startsWith("cx.") || k.startsWith("time.")) && v > 10) throw new HttpError(400, `${k} should be between 0 and 10`);
  }
  await saveSettings(values);
  await db.auditLog.create({ data: { actorId: u.id, action: "SCORING_CHANGED", target: "score_settings", meta: Object.keys(values).length + " values" } });
  return NextResponse.json({ ok: true });
});

export const DELETE = authed(async (_req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can change scoring weights");
  await resetSettings();
  await db.auditLog.create({ data: { actorId: u.id, action: "SCORING_RESET", target: "score_settings" } });
  return NextResponse.json({ ok: true });
});
