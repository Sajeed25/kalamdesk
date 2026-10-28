import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { dbRaw } from "./db";
import { ORG_COOKIE, SESSION_COOKIE, activeOrgFor } from "./tenancy";
import type { Role } from "./constants";

const COOKIE = SESSION_COOKIE;
const MAX_AGE_S = 60 * 60 * 12; // session timeout: 12h

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (>= 32 chars)");
  return new TextEncoder().encode(s);
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

/** The session remembers which organisation the person belongs to; the group owner may later switch (setActiveOrgCookie). */
export async function createSession(user: { id: string; orgId: string | null; allOrgs: boolean }) {
  const token = await new SignJWT({ uid: user.id, org: user.orgId, ao: user.allOrgs })
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
  cookies().delete(ORG_COOKIE); // always start in the home organisation
}

/** Group owners only (the caller checks): remember which organisation they are looking at. */
export function setActiveOrgCookie(orgId: string) {
  cookies().set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE_S });
}

export function destroySession() {
  cookies().delete(COOKIE);
  cookies().delete(ORG_COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  consentAt: Date | null;
  /** The organisation whose data this session is looking at right now. */
  orgId: string | null;
  /** The organisation the person belongs to. */
  homeOrgId: string | null;
  /** Group owner: may switch between organisations. */
  allOrgs: boolean;
};

export async function getUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.p) return null; // purpose-scoped tokens (e.g. re-auth) are never login sessions
    const u = await dbRaw.user.findUnique({ where: { id: String(payload.uid) } });
    if (!u || !u.active) return null;
    // Signed before organisations existed, or the person was moved / promoted since: sign in again.
    if (payload.org !== u.orgId || (payload.ao === true) !== u.allOrgs) return null;
    // An archived organisation locks out its own people (group owners can still get in to restore it).
    if (!u.allOrgs && u.orgId && !(await dbRaw.organization.count({ where: { id: u.orgId, active: true } }))) return null;
    const orgId = activeOrgFor(payload, cookies().get(ORG_COOKIE)?.value);
    return { id: u.id, name: u.name, email: u.email, role: u.role as Role, departmentId: u.departmentId, consentAt: u.consentAt, orgId, homeOrgId: u.orgId, allOrgs: u.allOrgs };
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
