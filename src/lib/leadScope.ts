import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { teamIds } from "./tasks";

/** Leads this person may see: founders all, managers their team's, everyone else their own. */
export async function leadWhere(u: SessionUser): Promise<Prisma.LeadWhereInput> {
  if (u.role === "FOUNDER") return {};
  if (u.role === "MANAGER") return { ownerId: { in: [u.id, ...(await teamIds(u.id))] } };
  return { ownerId: u.id };
}
