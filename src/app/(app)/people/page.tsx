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
      <div className="flex items-center justify-between"><h1 className="page-title">People</h1>{u.role === "FOUNDER" && <div className="flex gap-2"><Link href="/departments" className="btn">Departments</Link><Link href="/people/new" className="btn btn-primary">+ Add person</Link></div>}</div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-mute">
            <tr>
              <th className="px-3 py-2">Name</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Dept</th>
              {lead && <><th className="px-3 py-2">Office</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Reports to</th></>}
            </tr>
          </thead>
          <tbody>
            {users.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-medium">
                  {lead ? <Link href={`/people/${p.id}`} className="hover:underline">{p.name}</Link> : p.name}{u.role === "FOUNDER" && <Link href={`/people/${p.id}/edit`} className="ml-2 text-xs text-mute underline">edit</Link>}
                  {p.role === "INTERN" && <span className="chip ml-2 bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">Intern</span>}
                </td>
                <td className="px-3 py-2 text-mute">{p.profile?.title ?? p.role}</td>
                <td className="px-3 py-2">{p.department?.name ?? "—"}</td>
                {lead && <>
                  <td className="px-3 py-2">{p.profile?.office}</td>
                  <td className="px-3 py-2 text-mute">{p.email}</td>
                  <td className="px-3 py-2 text-mute">{p.profile?.phone ?? "—"}</td>
                  <td className="px-3 py-2 text-mute">{p.profile?.manager?.name ?? "—"}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-mute">{lead ? "Bank and ID details are never part of this directory; founders open them from a person's edit page." : "Contact details are visible to managers and founders only."}</p>
    </div>
  );
}
