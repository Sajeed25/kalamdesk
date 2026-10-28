import { ForgotForm } from "@/components/PasswordForms";

export default function Forgot() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="mb-6 text-sm text-mute">We&apos;ll email you a link to choose a new one.</p>
      <ForgotForm />
    </main>
  );
}
