import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { cryptoConfigured } from "@/lib/crypto";
import BankDetails from "@/components/BankDetails";

export const dynamic = "force-dynamic";

export default async function Bank({ params }: { params: { id: string } }) {
  const u = await requireUser();
  if (!isFounder(u)) redirect("/people"); // managers and everyone else never reach this page
  const person = await db.user.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!person) notFound();
  const row = await db.employeeSensitive.findUnique({ where: { userId: person.id } });
  // The page only receives the masked view; plaintext never touches the server-rendered HTML.
  const masked = {
    encryptionReady: cryptoConfigured(), saved: !!row, account: row?.last4 ? `••••••••${row.last4}` : null,
    idType: row?.idType ?? null, updatedAt: row?.updatedAt?.toISOString() ?? null,
    has: {
      accountHolder: !!row?.accountHolderEnc, accountNumber: !!row?.accountNumberEnc, ifsc: !!row?.ifscEnc,
      bankName: !!row?.bankNameEnc, upiId: !!row?.upiIdEnc, idNumber: !!row?.idNumberEnc,
    },
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/people/${person.id}/edit`} className="text-sm text-mute hover:underline">← {person.name}</Link>
      <div>
        <h1 className="page-title">Bank &amp; ID details</h1>
        <p className="text-sm text-mute">Encrypted at rest, founder-only, masked by default. Never included in emails, exports or logs.</p>
      </div>
      <BankDetails userId={person.id} masked={masked} />
    </div>
  );
}
