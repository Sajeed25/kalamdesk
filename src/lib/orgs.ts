import { cache } from "react";
import { z } from "zod";
import { dbRaw } from "./db";
import { runInOrg } from "./tenancy";
import { HttpError } from "./httpError";

export function requireOwner(u: { allOrgs: boolean }) {
  if (!u.allOrgs) throw new HttpError(403, "Only a group owner can manage organisations");
}

export type Org = { id: string; name: string; slug: string; tagline: string; color: string; active: boolean };

export const orgSchema = z.object({
  name: z.string().trim().min(2, "Give the organisation a name").max(100),
  tagline: z.string().trim().max(160).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour").default("#4f46e5"),
});

export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "org";


/** Every organisation (unfiltered: only the group owner and server jobs may call this). */
export const listOrgs = (includeArchived = false): Promise<Org[]> =>
  dbRaw.organization.findMany({ where: includeArchived ? {} : { active: true }, orderBy: { name: "asc" } });

/** The organisation the signed-in person is looking at (cached for the request). */
export const getOrg = cache(async (orgId: string | null): Promise<Org | null> =>
  orgId ? dbRaw.organization.findUnique({ where: { id: orgId } }) : null);

/** Run a scheduled job once per active organisation, each inside its own isolation scope. */
export async function forEachOrg<T>(fn: (org: Org) => Promise<T>): Promise<{ org: Org; result: T }[]> {
  const orgs = await listOrgs();
  const out: { org: Org; result: T }[] = [];
  for (const org of orgs) out.push({ org, result: await runInOrg(org.id, () => fn(org)) });
  return out;
}

/** First-run helper: the organisation a freshly created founder should belong to. */
export async function ensureDefaultOrg(name = "Robokalam"): Promise<Org> {
  const existing = await dbRaw.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return dbRaw.organization.create({ data: { name, slug: slugify(name), color: "#4f46e5" } });
}
