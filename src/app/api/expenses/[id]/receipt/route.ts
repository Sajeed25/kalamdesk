import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { storage } from "@/lib/storage";
import { fileResponse } from "@/lib/files";

// Only the claimant and founders can open a receipt. Served as a download with nosniff.
export const GET = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const c = await db.expenseClaim.findUnique({ where: { id: params.id } });
  if (!c || !c.receiptKey || !(isFounder(u) || c.userId === u.id)) throw new HttpError(404, "Not found");
  const data = await storage.get(c.receiptKey).catch(() => null);
  if (!data) throw new HttpError(404, "The receipt file is missing");
  return fileResponse(data, c.receiptName ?? "receipt", c.receiptMime ?? "application/octet-stream", new URL(req.url).searchParams.get("download") === "1");
});
