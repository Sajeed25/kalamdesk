import { requireUser } from "@/lib/auth";
import { isLead } from "@/lib/rbac";
import { db } from "@/lib/db";
import { levelFor, lifetimePoints } from "@/lib/gamify";
import Nav, { Logo } from "@/components/Nav";
import Bell from "@/components/Bell";
import QuickAdd from "@/components/QuickAdd";
import Consent from "@/components/Consent";
import ToastHost from "@/components/ToastHost";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [people, pts] = await Promise.all([
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    lifetimePoints(user.id),
  ]);
  const lvl = levelFor(pts);

  return (
    <div className="min-h-screen md:flex">
      <Nav lead={isLead(user)} name={user.name} role={user.role} lvl={lvl} />
      <div className="min-w-0 flex-1 pb-28 md:pb-0">
        <header className="glass sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3 md:hidden"><Logo size="h-9 w-9" /><span className="text-lg font-extrabold tracking-tight">KalamDesk</span></div>
          <p className="hidden text-sm font-semibold text-mute md:block">Press <kbd className="rounded-lg border border-line bg-card px-2 py-0.5 font-sans text-xs font-bold text-ink shadow-sm">N</kbd> anywhere to add a task</p>
          <div className="flex items-center gap-2"><QuickAdd people={people} meId={user.id} canAssign={isLead(user)} /><Bell /></div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <ToastHost />
      {!user.consentAt && <Consent />}
    </div>
  );
}
