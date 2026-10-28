import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function People() {
  const u = await requireUser();
  const lead = isLead(u);
  const users = await db.user.findMany({
    where: { active: true },
    include: { department: true, profile: { include: { manager: { select: { name: true } } } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">People</h1>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-mute">
            <tr>
              <th className="px-3 py-2">Name</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Dept</th>
              <th className="px-3 py-2">Office</th><th className="px-3 py-2">Email</th>
              {lead && <th className="px-3 py-2">Phone</th>}<th className="px-3 py-2">Reports to</th>
            </tr>
          </thead>
          <tbody>
            {users.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-medium">
                  {lead ? <Link href={`/people/${p.id}`} className="hover:underline">{p.name}</Link> : p.name}
                  {p.role === "INTERN" && <span className="chip ml-2 bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">Intern</span>}
                </td>
                <td className="px-3 py-2 text-mute">{p.profile?.title ?? p.role}</td>
                <td className="px-3 py-2">{p.department?.name ?? "—"}</td>
                <td className="px-3 py-2">{p.profile?.office}</td>
                <td className="px-3 py-2 text-mute">{p.email}</td>
                {lead && <td className="px-3 py-2 text-mute">{p.profile?.phone ?? "—"}</td>}
                <td className="px-3 py-2 text-mute">{p.profile?.manager?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-mute">Bank and ID details are not part of this directory; they arrive in Phase 3 as an encrypted, founder-only section.</p>
    </div>
  );
}
