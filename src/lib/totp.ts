import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Time-based one-time passwords (RFC 6238, HMAC-SHA1, 6 digits, 30 s), compatible with Google Authenticator,
 * Microsoft Authenticator, Authy and 1Password. Implemented here (about 60 lines) rather than as a dependency.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error("Invalid base32");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newSecret = () => base32Encode(randomBytes(20)); // 160-bit secret

export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const h = createHmac("sha1", secret).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export const counterAt = (timeMs: number, step = 30) => Math.floor(timeMs / 1000 / step);

export function totp(secretB32: string, timeMs = Date.now(), digits = 6, step = 30) {
  return hotp(base32Decode(secretB32), counterAt(timeMs, step), digits);
}

const safeEq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** The counter the code matches (within +/- `window` steps of clock drift), or null. Constant-time comparison. */
export function matchTotp(secretB32: string, code: string, timeMs = Date.now(), window = 1): number | null {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const secret = base32Decode(secretB32);
  const now = counterAt(timeMs);
  let hit: number | null = null;
  for (let c = now - window; c <= now + window; c++) if (safeEq(hotp(secret, c), clean)) hit = c; // no early exit
  return hit;
}

export const otpauthUrl = (account: string, issuer: string, secretB32: string) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// ---------- recovery codes ----------
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // no lookalikes (0/o, 1/l/i)

export function newRecoveryCodes(n = 8): string[] {
  return Array.from({ length: n }, () => {
    const b = randomBytes(10);
    const s = Array.from(b, (x) => CODE_CHARS[x % CODE_CHARS.length]).join("");
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}
export const normaliseRecovery = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const hashRecovery = (s: string) => createHash("sha256").update(normaliseRecovery(s)).digest("hex");
export const looksLikeRecovery = (s: string) => normaliseRecovery(s).length === 10 && !/^\d{6}$/.test(s.replace(/\s/g, ""));
