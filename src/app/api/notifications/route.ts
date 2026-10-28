import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = authed(async (_req, u) => {
  const items = await db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json({ items, unread: items.filter((i) => !i.readAt).length });
});

// Mark all as read
export const POST = authed(async (_req, u) => {
  await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
});
