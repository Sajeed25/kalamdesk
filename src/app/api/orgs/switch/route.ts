import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { dbRaw } from "@/lib/db";
import { setActiveOrgCookie } from "@/lib/auth";
import { HttpError } from "@/lib/tasks";
import { requireOwner } from "@/lib/orgs";

// Group owners only: look at another organisation. Everything on screen is then that organisation's, and only that.
export const POST = authed(async (req, u) => {
  requireOwner(u);
  const { orgId } = z.object({ orgId: z.string().min(1) }).parse(await req.json());
  const org = await dbRaw.organization.findFirst({ where: { id: orgId, active: true } });
  if (!org) throw new HttpError(404, "That organisation isn't available");
  setActiveOrgCookie(org.id);
  return NextResponse.json({ ok: true, name: org.name });
});
