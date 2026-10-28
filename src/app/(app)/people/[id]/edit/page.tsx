import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import UserForm, { type UserFormValues } from "@/components/UserForm";

export const dynamic = "force-dynamic";

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditPerson({ params }: { params: { id: string } }) {
  const u = await requireUser();
  if (!isFounder(u)) redirect("/people");
  const p = await db.user.findUnique({ where: { id: params.id }, include: { profile: true } });
  if (!p) notFound();
  const [departments, managers] = await Promise.all([
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { active: true, role: { in: ["FOUNDER", "MANAGER"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const initial: UserFormValues = {
    id: p.id, name: p.name, email: p.email, role: p.role, departmentId: p.departmentId ?? "", active: p.active,
    office: p.profile?.office ?? "Hyderabad", title: p.profile?.title ?? "", phone: p.profile?.phone ?? "",
    personalEmail: p.profile?.personalEmail ?? "", emergencyContact: p.profile?.emergencyContact ?? "",
    employmentType: p.profile?.employmentType ?? "FULL_TIME", managerId: p.profile?.managerId ?? "",
    joinedOn: day(p.profile?.joinedOn), internStart: day(p.profile?.internStart), internEnd: day(p.profile?.internEnd),
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold">Edit {p.name}</h1><a href={`/people/${p.id}/bank`} className="btn">Bank &amp; ID details</a></div>
      <UserForm initial={initial} departments={departments} managers={managers} />
    </div>
  );
}
