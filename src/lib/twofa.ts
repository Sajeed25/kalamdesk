import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { verifyPassword } from "./auth";
import { cryptoConfigured, decryptField, encryptField } from "./crypto";
import { hashRecovery, looksLikeRecovery, matchTotp, newRecoveryCodes } from "./totp";

/**
 * Two-step sign-in. Passwords alone are never enough for an account that has it on:
 *   password OK -> short-lived "pending" cookie (5 min, scope p="2fa") -> code OK -> real session.
 * The TOTP secret is stored encrypted (AES-256-GCM, bound to the user), codes are single-use (replay protected),
 * and recovery codes are stored only as hashes.
 */
const PENDING = "kd_2fa";
const SETUP = "kd_2fa_setup";
const secretKey = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (>= 32 chars)");
  return new TextEncoder().encode(s);
};
const cookieOpts = (maxAge: number) => ({ httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/api", maxAge });

async function sign(claims: Record<string, unknown>, seconds: number) {
  return new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setExpirationTime(`${seconds}s`).sign(secretKey());
}
async function read(name: string, purpose: string): Promise<Record<string, unknown> | null> {
  const t = cookies().get(name)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secretKey());
    return payload.p === purpose ? payload : null;
  } catch {
    return null;
  }
}

export async function setPending(userId: string) {
  cookies().set(PENDING, await sign({ uid: userId, p: "2fa" }, 300), cookieOpts(300));
}
export async function readPending() {
  return ((await read(PENDING, "2fa"))?.uid as string | undefined) ?? null;
}
export const clearPending = () => cookies().delete(PENDING);

export async function setSetup(userId: string, secret: string) {
  cookies().set(SETUP, await sign({ uid: userId, s: secret, p: "2fa-setup" }, 600), cookieOpts(600));
}
export async function readSetup(userId: string) {
  const p = await read(SETUP, "2fa-setup");
  return p && p.uid === userId ? (p.s as string) : null;
}
export const clearSetup = () => cookies().delete(SETUP);

// ---- attempt throttle (per instance): 5 wrong codes in 10 minutes locks that account's code entry ----
const tries = new Map<string, { n: number; until: number }>();
export const isThrottled = (id: string) => {
  const t = tries.get(id);
  return !!t && t.until > Date.now() && t.n >= 5;
};
export const recordFail = (id: string) => tries.set(id, { n: (tries.get(id)?.n ?? 0) + 1, until: Date.now() + 10 * 60 * 1000 });
export const clearFails = (id: string) => tries.delete(id);

type U = { id: string; totpSecret: string | null };

export function secretFor(user: U): string | null {
  if (!user.totpSecret) return null;
  try {
    return decryptField(user.totpSecret, `${user.id}:totp`);
  } catch {
    console.error("[2fa] could not decrypt a stored secret (was FIELD_ENCRYPTION_KEY changed?)");
    return null;
  }
}

/** A 6-digit app code (single use) or a recovery code (single use). Returns which kind matched. */
export async function verifyCode(user: U, code: string): Promise<"totp" | "recovery" | null> {
  const raw = (code ?? "").trim();
  if (!raw) return null;
  if (looksLikeRecovery(raw)) {
    const row = await db.recoveryCode.findFirst({ where: { userId: user.id, codeHash: hashRecovery(raw), usedAt: null } });
    if (!row) return null;
    // atomic: only one request can consume it
    const r = await db.recoveryCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    return r.count === 1 ? "recovery" : null;
  }
  const secret = secretFor(user);
  if (!secret) return null;
  const counter = matchTotp(secret, raw);
  if (counter === null) return null;
  try {
    await db.jobRun.create({ data: { kind: "totp-used", key: `${user.id}:${counter}` } }); // replay protection
  } catch {
    return null;
  }
  return "totp";
}

export async function enableTwoFactor(userId: string, secret: string): Promise<string[]> {
  if (!cryptoConfigured()) throw new Error("FIELD_ENCRYPTION_KEY is not configured");
  await db.user.update({ where: { id: userId }, data: { totpSecret: encryptField(secret, `${userId}:totp`) } });
  return regenerateRecoveryCodes(userId);
}

export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = newRecoveryCodes();
  await db.recoveryCode.deleteMany({ where: { userId } });
  await db.recoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hashRecovery(c) })) });
  return codes;
}

export async function disableTwoFactor(userId: string) {
  await db.user.update({ where: { id: userId }, data: { totpSecret: null } });
  await db.recoveryCode.deleteMany({ where: { userId } });
}

export const recoveryRemaining = (userId: string) => db.recoveryCode.count({ where: { userId, usedAt: null } });

/**
 * Sensitive actions (reveal bank details, turn 2FA off, reset someone's 2FA) re-check the person: password,
 * plus a current code when they have 2FA on. `needs2fa` tells the UI to ask for the code.
 */
export async function confirmIdentity(userId: string, password: string, code?: string): Promise<{ ok: true } | { ok: false; status: number; error: string; needs2fa?: boolean }> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { ok: false, status: 401, error: "Wrong password" };
  if (user.totpSecret) {
    if (isThrottled(userId)) return { ok: false, status: 429, error: "Too many wrong codes. Try again in a few minutes." };
    if (!code?.trim()) return { ok: false, status: 401, error: "Enter the 6-digit code from your authenticator app", needs2fa: true };
    if (!(await verifyCode(user, code))) {
      recordFail(userId);
      return { ok: false, status: 401, error: "That code didn't work", needs2fa: true };
    }
    clearFails(userId);
  }
  return { ok: true };
}
