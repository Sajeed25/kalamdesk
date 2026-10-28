import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { cryptoConfigured } from "@/lib/crypto";
import { recoveryRemaining } from "@/lib/twofa";
import TwoFactorPanel from "@/components/TwoFactorPanel";

export const dynamic = "force-dynamic";

export default async function Security() {
  const u = await requireUser();
  const row = await db.user.findUnique({ where: { id: u.id }, select: { totpSecret: true } });
  const enabled = !!row?.totpSecret;
  return (
    <div className="space-y-5">
      <Link href="/settings" className="text-sm font-semibold text-mute hover:underline">← Settings</Link>
      <div><div className="eyebrow">Settings</div><h1 className="page-title mt-1">Security</h1></div>
      <TwoFactorPanel enabled={enabled} recoveryLeft={enabled ? await recoveryRemaining(u.id) : 0} encryptionReady={cryptoConfigured()} isFounder={isFounder(u)} />
      <p className="max-w-xl text-sm font-semibold text-mute">Lost your phone and your recovery codes? Another founder can switch your two-step sign-in off from your profile (they confirm with their own password and code). If you are the only founder, whoever manages the server can use the <code className="rounded bg-line px-1">RESET_2FA_EMAILS</code> setting described in the README.</p>
    </div>
  );
}
