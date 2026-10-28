import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { appUrl, emailStatus, emailTemplate, sendEmail } from "@/lib/email";

// Founder-only: sends one test message to the founder's own address and says exactly what went wrong if it fails.
export const POST = authed(async (_req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can send a test email");
  const status = emailStatus();
  if (status.mode === "console")
    return NextResponse.json({ ok: false, status, reason: "Email is not switched on: SMTP_HOST is empty, so messages are only written to the server log. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM, then restart the app." });
  const missing = [!status.userSet && "SMTP_USER", !status.passwordSet && "SMTP_PASSWORD"].filter(Boolean);
  if (missing.length) return NextResponse.json({ ok: false, status, reason: `Missing: ${missing.join(", ")}.` });

  const r = await sendEmail(u.email, "KalamDesk test email", emailTemplate({ heading: "Email is working 🎉", lines: ["This is a test message from KalamDesk. Invites, reminders and digests will arrive the same way."], ctaLabel: "Open KalamDesk", ctaUrl: appUrl("/") }));
  await db.auditLog.create({ data: { actorId: u.id, action: "TEST_EMAIL", target: u.id, meta: r.ok ? "sent" : "failed" } });
  return NextResponse.json({ ok: r.ok, status, reason: r.ok ? undefined : r.reason, sentTo: r.ok ? u.email : undefined }, { headers: { "Cache-Control": "no-store" } });
});
