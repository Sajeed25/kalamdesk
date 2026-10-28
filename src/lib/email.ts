// Transactional email via Resend's HTTP API. With no key set, emails are logged
// to the server console so local development needs no account.
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const link = /href="([^"]+)"/.exec(html)?.[1] ?? "";
    console.log(`[email:dev] to=${to} subject="${subject}" ${link}`);
    return { ok: true, dev: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) console.error("[email] failed", res.status, await res.text());
  return { ok: res.ok, dev: false };
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
