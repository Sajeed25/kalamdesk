import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import UserForm, { EMPTY_USER } from "@/components/UserForm";

export default async function NewPerson() {
  const u = await requireUser();
  if (!isFounder(u)) redirect("/people");
  const [departments, managers] = await Promise.all([
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { active: true, role: { in: ["FOUNDER", "MANAGER"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add person</h1>
      <UserForm initial={EMPTY_USER} departments={departments} managers={managers} />
    </div>
  );
}
