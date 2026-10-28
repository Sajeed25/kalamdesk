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

/** Which email settings are present (yes/no only, never the values). */
export function emailStatus() {
  return {
    mode: process.env.SMTP_HOST ? ("smtp" as const) : ("console" as const),
    hostSet: !!process.env.SMTP_HOST,
    userSet: !!process.env.SMTP_USER,
    passwordSet: !!process.env.SMTP_PASSWORD,
    fromSet: !!process.env.EMAIL_FROM,
    port: Number(process.env.SMTP_PORT ?? 465),
    // Shape checks for the usual hidden mistakes. Booleans only, never the values.
    userLooksLikeEmail: /^[^\s@"']+@[^\s@"']+[.][^\s@"']+$/.test(process.env.SMTP_USER ?? ""),
    userHasQuotesOrSpaces: (process.env.SMTP_USER ?? "") !== (process.env.SMTP_USER ?? "").trim() || /["']/.test(process.env.SMTP_USER ?? ""),
    passwordHasQuotesOrSpaces: (process.env.SMTP_PASSWORD ?? "") !== (process.env.SMTP_PASSWORD ?? "").trim() || /^["']|["']$/.test(process.env.SMTP_PASSWORD ?? ""),
    fromMatchesUser: !!process.env.SMTP_USER && (process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "").toLowerCase().includes((process.env.SMTP_USER ?? "").trim().toLowerCase()),
  };
}

/** A plain-language reason for a failed send. The raw error stays in the server log (it may contain addresses). */
export function describeEmailError(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; message?: string };
  const msg = (err?.message ?? "").toLowerCase();
  if (err?.code === "EAUTH" || err?.responseCode === 535 || msg.includes("invalid login") || msg.includes("authentication failed"))
    return "The mail server rejected the username or password. SMTP_USER must be the full mailbox address (for example desk@yourdomain.com) and SMTP_PASSWORD that mailbox's password.";
  if (err?.code === "ECONNREFUSED" || err?.code === "ENOTFOUND" || err?.code === "EDNS" || msg.includes("econnrefused") || msg.includes("enotfound") || msg.includes("getaddrinfo"))
    return "Could not find or reach the mail server. Check SMTP_HOST (Hostinger: smtp.hostinger.com) and SMTP_PORT.";
  if (err?.code === "ETIMEDOUT" || err?.code === "ESOCKET" || err?.code === "ECONNECTION" || msg.includes("timeout") || msg.includes("greeting"))
    return "The connection to the mail server timed out or was cut. Try SMTP_PORT=587 instead of 465 (or the other way round); some hosts block one of them.";
  if (msg.includes("wrong version number") || msg.includes("ssl") || msg.includes("tls"))
    return "Secure-connection mismatch. Port 465 uses SSL and port 587 uses STARTTLS. Make sure SMTP_PORT is 465 or 587.";
  if (err?.code === "EENVELOPE" || err?.responseCode === 550 || err?.responseCode === 553 || err?.responseCode === 554 || msg.includes("sender") || msg.includes("not owned") || msg.includes("relay"))
    return "The server refused the sender or recipient. EMAIL_FROM must be the same mailbox as SMTP_USER (or one of its aliases).";
  return "The mail server returned an error. Check the server log for lines starting with [email].";
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; dev: boolean; reason?: string }> {
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
    return { ok: false, dev: false, reason: describeEmailError(e) };
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
<p style="color:#94a3b8;font-size:12px">KalamDesk</p></div>`;
}
export { esc as escapeHtml };
