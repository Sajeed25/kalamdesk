"use client";
import { useState } from "react";

// DPDP Act 2023 consent notice: shown once at onboarding, blocks the app until accepted.
export default function Consent({ orgName }: { orgName: string }) {
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    await fetch("/api/me/consent", { method: "POST" });
    window.location.reload();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="panel max-w-md space-y-3 p-5 text-sm">
        <h2 className="text-lg font-bold">Your data at {orgName}</h2>
        <p>KalamDesk stores your name, contact details, work records and task performance so we can assign work, measure delivery fairly and run incentives.</p>
        <ul className="list-disc space-y-1 pl-5 text-mute">
          <li>Used only for these workplace purposes, and shared only with processors we use (email, hosting).</li>
          <li>Bank and ID details are encrypted and visible only to founders.</li>
          <li>You may ask to correct or delete your data at any time by contacting HR.</li>
        </ul>
        <button onClick={accept} disabled={busy} className="btn btn-primary w-full">I understand and agree</button>
      </div>
    </div>
  );
}
