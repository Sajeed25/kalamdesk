import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Field-level encryption for bank and ID data: AES-256-GCM.
 *
 * - Key: FIELD_ENCRYPTION_KEY, 32 random bytes, base64. Keep it only in the server environment / secrets
 *   manager, never in the database or the repository. Losing it makes the data unrecoverable.
 * - Each value gets a fresh random 12-byte IV, and is bound (as GCM "additional data") to the person and
 *   field it belongs to, so a ciphertext copied into another person's row or another column fails to decrypt.
 * - Stored format: "v1:" + base64(iv | authTag | ciphertext). The version prefix allows key rotation later.
 * - Fails closed: a missing or malformed key throws; nothing is ever stored unencrypted.
 */
const VERSION = "v1";

export class CryptoConfigError extends Error {}

function key(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new CryptoConfigError("FIELD_ENCRYPTION_KEY is not set");
  const k = Buffer.from(raw.trim(), "base64");
  if (k.length !== 32) throw new CryptoConfigError("FIELD_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return k;
}

export function cryptoConfigured() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptField(plain: string, aad: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `${VERSION}:${Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64")}`;
}

export function decryptField(token: string, aad: string): string {
  const [v, body] = token.split(":");
  if (v !== VERSION || !body) throw new Error("Unsupported ciphertext format");
  const buf = Buffer.from(body, "base64");
  if (buf.length < 29) throw new Error("Ciphertext too short");
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

/** "XXXXXXXX1234" -> "••••••••1234". Short values are fully masked. */
export function maskTail(value: string, visible = 4) {
  return value.length <= visible ? "•".repeat(value.length) : "•".repeat(Math.min(value.length - visible, 12)) + value.slice(-visible);
}
