import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { dbRaw } from "@/lib/db";
import { listOrgs } from "@/lib/orgs";
import OrgManager, { type OrgCard, type OwnerRow } from "@/components/OrgManager";
import StoragePanel from "@/components/StoragePanel";

export const dynamic = "force-dynamic";

// Group owners only: every organisation at a glance, and the way to start a new one.
// This is the one screen that deliberately looks across organisations; it shows counts and founders, never tasks or personal data.
export default async function Organisations() {
  const u = await requireUser();
  if (!u.allOrgs) redirect("/");
  const [orgs, people, open, founders, owners] = await Promise.all([
    listOrgs(true),
    dbRaw.user.groupBy({ by: ["orgId"], where: { active: true, allOrgs: false }, _count: { _all: true } }),
    dbRaw.task.groupBy({ by: ["orgId"], where: { status: { notIn: ["DONE", "CANCELLED"] } }, _count: { _all: true } }),
    dbRaw.user.findMany({ where: { role: "FOUNDER", active: true, allOrgs: false }, select: { orgId: true, name: true } }),
    dbRaw.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true, name: true, email: true, allOrgs: true, orgId: true }, orderBy: { name: "asc" } }),
  ]);
  const cards: OrgCard[] = orgs.map((o) => ({
    id: o.id, name: o.name, tagline: o.tagline, color: o.color, active: o.active, home: o.id === u.homeOrgId, current: o.id === u.orgId,
    people: people.find((p) => p.orgId === o.id)?._count._all ?? 0,
    openTasks: open.find((p) => p.orgId === o.id)?._count._all ?? 0,
    founders: founders.filter((f) => f.orgId === o.id).map((f) => f.name),
  }));
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));
  const ownerRows: OwnerRow[] = owners.map((f) => ({ id: f.id, name: f.name, email: f.email, allOrgs: f.allOrgs, org: orgName.get(f.orgId ?? "") ?? "", me: f.id === u.id }));
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="eyebrow">Group</p>
        <h1 className="page-title">Organisations</h1>
        <p className="mt-1 max-w-2xl text-mute">Each organisation has its own people, tasks, scores, leads and expenses. Nobody in one can see another; only group owners can move between them.</p>
      </div>
      <OrgManager orgs={cards} owners={ownerRows} />
      <StoragePanel />
    </div>
  );
}
