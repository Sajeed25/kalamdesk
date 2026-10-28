/**
 * WhatsApp Business Cloud API (Meta). Off unless all three of WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and
 * WHATSAPP_TEMPLATE are set. Business-initiated messages must use a pre-approved TEMPLATE. Create one in
 * Meta Business Manager with a body of exactly three variables, for example:
 *     {{1}} - {{2}}  Open: {{3}}
 * and set WHATSAPP_TEMPLATE to its name (WHATSAPP_LANG to its language code, default "en").
 */
export const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE);

/** Indian numbers: accepts 9876543210, 09876543210, +91 98765 43210, 919876543210. Returns digits with country code, or null. */
export function normalizePhone(input: string | null | undefined): string | null {
  let d = (input ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return /^91[6-9]\d{9}$/.test(d) ? d : null;
}

// Template variables may not contain newlines, tabs, or runs of 4+ spaces, and have length limits.
const clean = (s: string, max: number) => s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, max) || "-";

export async function sendWhatsapp(toPhone: string, title: string, body: string, link: string): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  const base = (process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "template",
        template: {
          name: process.env.WHATSAPP_TEMPLATE,
          language: { code: process.env.WHATSAPP_LANG ?? "en" },
          components: [{ type: "body", parameters: [clean(title, 120), clean(body, 200), clean(link, 200)].map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[whatsapp] send failed: HTTP ${res.status} to ***${toPhone.slice(-2)}`); // never log the full number or the token
    return res.ok;
  } catch (e) {
    console.error("[whatsapp] send error:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Free-form reply inside the 24-hour window that opens when a person messages us first. */
export async function sendWhatsappText(toPhone: string, body: string): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  const base = (process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: toPhone, type: "text", text: { body: body.slice(0, 1500) } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[whatsapp] reply failed: HTTP ${res.status} to ***${toPhone.slice(-2)}`);
    return res.ok;
  } catch (e) {
    console.error("[whatsapp] reply error:", e instanceof Error ? e.message : e);
    return false;
  }
}
