import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/PasswordForms";

export default async function Settings() {
  const u = await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-mute">Signed in as {u.name} ({u.email})</p>
      <ChangePasswordForm />
    </div>
  );
}
