import nodemailer, { type Transporter } from "nodemailer";

// Transactional email over SMTP (built for Hostinger mailboxes, works with any SMTP server).
// With SMTP_HOST empty, emails are logged to the server console so development needs no mailbox.
let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS (upgraded automatically)
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_HOST) {
    const link = /href="([^"]+)"/.exec(html)?.[1] ?? "";
    console.log(`[email:dev] to=${to} subject="${subject}" ${link}`);
    return { ok: true, dev: true };
  }
  try {
    await getTransporter().sendMail({
      // Hostinger only accepts a From address that belongs to the authenticated mailbox.
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return { ok: true, dev: false };
  } catch (e) {
    // Never let a mail failure break the task action that triggered it.
    console.error("[email] send failed:", e instanceof Error ? e.message : e);
    return { ok: false, dev: false };
  }
}

export const appUrl = (path = "") => `${process.env.APP_URL ?? "http://localhost:3000"}${path}`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Shared template. Never put sensitive employee data (bank/ID) in here. */
export function emailTemplate(opts: { heading: string; lines: string[]; ctaLabel?: string; ctaUrl?: string }) {
  const cta = opts.ctaUrl
    ? `<p style="margin:24px 0"><a href="${opts.ctaUrl}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${esc(opts.ctaLabel ?? "Open")}</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#0f172a">
<h2 style="margin:0 0 12px">${esc(opts.heading)}</h2>
${opts.lines.map((l) => `<p style="margin:6px 0;color:#334155">${l}</p>`).join("")}${cta}
<p style="color:#94a3b8;font-size:12px">KalamDesk · Robokalam</p></div>`;
}
export { esc as escapeHtml };
