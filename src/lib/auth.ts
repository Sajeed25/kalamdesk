import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { Role } from "./constants";

const COOKIE = "kd_session";
const MAX_AGE_S = 60 * 60 * 12; // session timeout: 12h

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (>= 32 chars)");
  return new TextEncoder().encode(s);
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(key());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  consentAt: Date | null;
};

export async function getUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const u = await db.user.findUnique({ where: { id: String(payload.uid) } });
    if (!u || !u.active) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role as Role, departmentId: u.departmentId, consentAt: u.consentAt };
  } catch {
    return null;
  }
}

/** For pages: redirect to /login when signed out. */
export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}
