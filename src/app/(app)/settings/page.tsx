import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { ChangePasswordForm } from "@/components/PasswordForms";
import WhatsAppPrefs from "@/components/WhatsAppPrefs";
import EmailCheck from "@/components/EmailCheck";
import PrivacyCard from "@/components/PrivacyCard";
import CalendarFeedCard from "@/components/CalendarFeedCard";
import BirthdayCard from "@/components/BirthdayCard";
import { whatsappConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const u = await requireUser();
  const profile = await db.employeeProfile.findUnique({ where: { userId: u.id }, select: { phone: true, whatsappOptIn: true } });
  const bday = await db.personDate.findUnique({ where: { userId: u.id } }).catch(() => null);
  return (
    <div className="space-y-4">
      <h1 className="page-title">Settings</h1>
      <p className="text-sm text-mute">Signed in as {u.name} ({u.email})</p>
      <div className="flex flex-wrap items-start gap-4">
        <ChangePasswordForm />
        <CalendarFeedCard />
        <BirthdayCard current={bday?.birthday ?? null} />
        <PrivacyCard isFounder={isFounder(u)} />
        <WhatsAppPrefs configured={whatsappConfigured()} phone={profile?.phone ?? ""} optIn={profile?.whatsappOptIn ?? false} />
      </div>
      <p className="text-sm font-bold"><Link href="/settings/security" className="underline">🔒 Security: two-step sign-in</Link></p>
      {isFounder(u) && <EmailCheck />}
      {isFounder(u) && <p className="text-sm"><Link href="/settings/scoring" className="underline">Scoring weights</Link></p>}
    </div>
  );
}
