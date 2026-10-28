import Link from "next/link";
import { ResetForm } from "@/components/PasswordForms";
import { tokenValid } from "@/lib/reset";

export const dynamic = "force-dynamic";

export default async function Reset({ params }: { params: { token: string } }) {
  const valid = await tokenValid(params.token);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-bold">Choose a password</h1>
      {valid ? (
        <ResetForm token={params.token} />
      ) : (
        <div className="panel space-y-3 p-5 text-sm">
          <p>This link is invalid or has expired.</p>
          <Link href="/forgot" className="btn w-full">Request a new link</Link>
        </div>
      )}
    </main>
  );
}
