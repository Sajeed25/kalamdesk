import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { HttpError } from "./tasks";

/**
 * Re-authentication for sensitive actions. After the founder re-enters their password, a separate
 * short-lived cookie (5 minutes, scoped to /api) proves it. It is a different cookie from the session and
 * carries p="reauth", so it can never be used as a login session (getUser rejects any token with a `p` claim).
 */
const COOKIE = "kd_reauth";
export const REAUTH_SECONDS = 5 * 60;

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (>= 32 chars)");
  return new TextEncoder().encode(s);
};

export async function grantReauth(userId: string) {
  const token = await new SignJWT({ uid: userId, p: "reauth" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(`${REAUTH_SECONDS}s`).sign(secret());
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/api", maxAge: REAUTH_SECONDS });
}

export async function requireRecentReauth(userId: string) {
  const token = cookies().get(COOKIE)?.value;
  try {
    if (token) {
      const { payload } = await jwtVerify(token, secret());
      if (payload.p === "reauth" && payload.uid === userId) return;
    }
  } catch {
    /* fall through */
  }
  throw new HttpError(401, "Please confirm your password again to view sensitive details");
}
