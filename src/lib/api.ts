import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUser, type SessionUser } from "./auth";
import { HttpError } from "./tasks";

type Handler<C> = (req: Request, user: SessionUser, ctx: C) => Promise<Response>;

/** Wraps an API route: auth + uniform error responses. */
export function authed<C = unknown>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      return await fn(req, user, ctx);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input", issues: e.issues }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  };
}

/** Cron routes: shared-secret bearer token. */
export function cronAuthorized(req: Request) {
  const s = process.env.CRON_SECRET;
  return !!s && req.headers.get("authorization") === `Bearer ${s}`;
}
