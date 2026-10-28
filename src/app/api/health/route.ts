import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Setup check for a fresh deployment. Public, so it only reports yes/no flags:
 * no values, counts, paths or error text that could help an attacker.
 */
export async function GET() {
  const out = {
    sessionSecretOk: (process.env.SESSION_SECRET?.length ?? 0) >= 32,
    databaseUrlSet: !!process.env.DATABASE_URL,
    dbReachable: false,
    schemaReady: false,
    hasUsers: false,
  };
  try {
    await db.$queryRaw`SELECT 1`;
    out.dbReachable = true;
    out.hasUsers = (await db.user.count()) > 0;
    out.schemaReady = true;
  } catch (e) {
    console.error("[health]", e instanceof Error ? e.message : e);
  }
  const ok = out.sessionSecretOk && out.dbReachable && out.schemaReady && out.hasUsers;
  return NextResponse.json({ ok, ...out }, { status: ok ? 200 : 503 });
}
