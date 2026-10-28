import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { ChangePasswordForm } from "@/components/PasswordForms";
import WhatsAppPrefs from "@/components/WhatsAppPrefs";
import { whatsappConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const u = await requireUser();
  const profile = await db.employeeProfile.findUnique({ where: { userId: u.id }, select: { phone: true, whatsappOptIn: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-mute">Signed in as {u.name} ({u.email})</p>
      <div className="flex flex-wrap items-start gap-4">
        <ChangePasswordForm />
        <WhatsAppPrefs configured={whatsappConfigured()} phone={profile?.phone ?? ""} optIn={profile?.whatsappOptIn ?? false} />
      </div>
      {isFounder(u) && <p className="text-sm"><Link href="/settings/scoring" className="underline">Scoring weights</Link></p>}
    </div>
  );
}
