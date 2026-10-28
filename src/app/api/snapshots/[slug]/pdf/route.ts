import { authed } from "@/lib/api";
import { HttpError } from "@/lib/tasks";
import { loadSnapshot, snapshotPdf } from "@/lib/snapshots";

export const GET = authed<{ params: { slug: string } }>(async (_req, _u, { params }) => {
  const found = await loadSnapshot(params.slug);
  if (!found) throw new HttpError(404, "Snapshot not found");
  const bytes = await snapshotPdf(`Team dashboard: ${found.snap.label}`, found.payload);
  const name = `kalamdesk-${found.snap.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
});
