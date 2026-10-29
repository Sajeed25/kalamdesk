import { requireUser } from "@/lib/auth";
import { isLead } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getOrg, listOrgs } from "@/lib/orgs";
import { orgThemeCss } from "@/lib/orgTheme";
import OrgSwitcher from "@/components/OrgSwitcher";
import InstallApp from "@/components/InstallApp";
import { levelFor, lifetimePoints } from "@/lib/gamify";
import Nav, { Logo } from "@/components/Nav";
import Bell from "@/components/Bell";
import QuickAdd from "@/components/QuickAdd";
import Consent from "@/components/Consent";
import ToastHost from "@/components/ToastHost";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [org, orgs, people, pts] = await Promise.all([
    getOrg(user.orgId),
    user.allOrgs ? listOrgs() : Promise.resolve([]),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    lifetimePoints(user.id),
  ]);
  const lvl = levelFor(pts);
  const here = org ?? { id: "", name: "KalamDesk", color: "#4f46e5" };
  const lite = orgs.map((o) => ({ id: o.id, name: o.name, color: o.color }));
  // Founders can reveal bank details, so remind them (non-blocking) until two-step sign-in is on.
  const needs2fa = user.role === "FOUNDER" && !(await db.user.findUnique({ where: { id: user.id }, select: { totpSecret: true } }))?.totpSecret;

  return (
    <div className="min-h-screen md:flex">
      <style dangerouslySetInnerHTML={{ __html: orgThemeCss(here.color) }} />
      <Nav lead={isLead(user)} name={user.name} role={user.role} lvl={lvl} org={{ id: here.id, name: here.name, color: here.color }} orgs={lite} owner={user.allOrgs} />
      <div className="min-w-0 flex-1 pb-28 md:pb-0">
        <header className="glass sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3 sm:px-8">
          <div className="min-w-0 max-w-[60%] md:hidden"><OrgSwitcher current={{ id: here.id, name: here.name, color: here.color }} orgs={lite} canSwitch={user.allOrgs} compact /></div>
          <p className="hidden text-sm font-semibold text-mute md:block">Press <kbd className="rounded-lg border border-line bg-card px-2 py-0.5 font-sans text-xs font-bold text-ink shadow-sm">N</kbd> anywhere to add a task</p>
          <div className="flex items-center gap-2"><InstallApp /><QuickAdd people={people} meId={user.id} canAssign={isLead(user)} /><Bell /></div>
        </header>
        {needs2fa && (
          <Link href="/settings/security" className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 px-5 py-3 text-sm font-bold sm:mx-8">
            <span>🔒 Protect your account: turn on two-step sign-in. Founder accounts can view bank details.</span><span className="underline">Set up</span>
          </Link>
        )}
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <ToastHost />
      {!user.consentAt && <Consent orgName={here.name} />}
    </div>
  );
}
