import { requireUser } from "@/lib/auth";
import { isLead } from "@/lib/rbac";
import { db } from "@/lib/db";
import Nav from "@/components/Nav";
import Bell from "@/components/Bell";
import QuickAdd from "@/components/QuickAdd";
import Consent from "@/components/Consent";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const people = await db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div className="min-h-screen md:flex">
      <Nav lead={isLead(user)} name={user.name} role={user.role} />
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-line bg-paper/90 px-4 py-2 backdrop-blur">
          <QuickAdd people={people} meId={user.id} canAssign={isLead(user)} />
          <Bell />
        </header>
        <main className="mx-auto max-w-[1400px] p-4">{children}</main>
      </div>
      {!user.consentAt && <Consent />}
    </div>
  );
}
