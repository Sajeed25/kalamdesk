import { randomBytes } from "crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "./db";
import { currentRange } from "./metrics";
import { fmtDateTime } from "./time";
import type { DashboardData } from "./dashboard";

export type SnapshotPayload = { data: DashboardData; generatedAt: string; generatedBy: string; scope: string };

export const newSlug = () => randomBytes(18).toString("base64url"); // 24 URL-safe chars, unguessable

export function snapshotLabel(period: "week" | "month", now = new Date()) {
  const r = currentRange(period, now);
  const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...o }).format(d);
  return period === "week" ? `Week of ${f(r.from, { day: "numeric", month: "short" })}` : f(r.from, { month: "long", year: "numeric" });
}

export async function loadSnapshot(slug: string) {
  const s = await db.dashboardSnapshot.findUnique({ where: { shareSlug: slug } });
  if (!s) return null;
  try {
    return { snap: s, payload: JSON.parse(s.payload) as SnapshotPayload };
  } catch {
    return null;
  }
}

// ---------------- PDF ----------------
// pdf-lib's built-in fonts only cover Latin-1, so anything else is replaced rather than crashing.
const safe = (s: string) => s.replace(/[^\x20-\x7E -ÿ]/g, "?");

export async function snapshotPdf(title: string, p: SnapshotPayload): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 48;
  const ink = rgb(0.06, 0.09, 0.16), mute = rgb(0.4, 0.44, 0.5), blue = rgb(0.16, 0.47, 0.84), orange = rgb(0.92, 0.41, 0.2), red = rgb(0.82, 0.23, 0.23), line = rgb(0.86, 0.87, 0.89);

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const ensure = (need: number) => { if (y - need < M) { page = pdf.addPage([W, H]); y = H - M; } };
  const text = (s: string, x: number, size = 10, f: PDFFont = font, color = ink) => page.drawText(safe(s), { x, y, size, font: f, color });
  const heading = (s: string) => { ensure(40); y -= 10; text(s, M, 13, bold); y -= 8; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: line }); y -= 16; };

  text("KalamDesk", M, 10, bold, blue); y -= 22;
  text(title, M, 20, bold); y -= 20;
  text(`${p.data.label} · ${p.scope} · published ${fmtDateTime(p.generatedAt)} by ${p.generatedBy}`, M, 9, font, mute); y -= 26;

  const k = p.data.kpis;
  const tiles: [string, string][] = [["Assigned", String(k.assigned)], ["Completed", String(k.completed)], ["On time", k.onTimePct === null ? "n/a" : `${k.onTimePct}%`], ["Overdue now", String(k.overdueNow)], ["Blocked now", String(k.blockedNow)]];
  const tw = (W - 2 * M - 4 * 8) / 5;
  tiles.forEach(([label, value], i) => {
    const x = M + i * (tw + 8);
    page.drawRectangle({ x, y: y - 46, width: tw, height: 46, borderColor: line, borderWidth: 0.8 });
    page.drawText(label.toUpperCase(), { x: x + 8, y: y - 14, size: 7, font, color: mute });
    page.drawText(value, { x: x + 8, y: y - 36, size: 18, font: bold, color: ink });
  });
  y -= 70;

  // horizontal bar rows: label, one or two values
  const bars = (rows: { label: string; a: number; b?: number }[], colorA = blue, colorB = orange, legend?: [string, string]) => {
    if (legend) { ensure(16); page.drawRectangle({ x: M, y: y - 1, width: 8, height: 8, color: colorA }); text(legend[0], M + 12, 8, font, mute); page.drawRectangle({ x: M + 90, y: y - 1, width: 8, height: 8, color: colorB }); text(legend[1], M + 102, 8, font, mute); y -= 16; }
    const max = Math.max(1, ...rows.map((r) => Math.max(r.a, r.b ?? 0)));
    const barW = W - 2 * M - 150;
    for (const r of rows) {
      ensure(r.b === undefined ? 16 : 26);
      text(r.label.slice(0, 22), M, 9, font, ink);
      page.drawRectangle({ x: M + 130, y: y - 1, width: Math.max(1, (r.a / max) * barW), height: 8, color: colorA });
      text(String(r.a), M + 134 + (r.a / max) * barW, 8, font, mute);
      if (r.b !== undefined) {
        y -= 10;
        page.drawRectangle({ x: M + 130, y: y - 1, width: Math.max(1, (r.b / max) * barW), height: 8, color: colorB });
        text(String(r.b), M + 134 + (r.b / max) * barW, 8, font, mute);
      }
      y -= 16;
    }
  };

  heading("Completion trend");
  const maxT = Math.max(1, ...p.data.trend.map((t) => Math.max(t.completed, t.created)));
  const bw = Math.min(26, (W - 2 * M) / Math.max(1, p.data.trend.length) - 6);
  ensure(110);
  const base = y - 90;
  p.data.trend.forEach((t, i) => {
    const x = M + i * (bw * 2 + 8);
    if (x + bw * 2 > W - M) return;
    page.drawRectangle({ x, y: base, width: bw, height: Math.max(1, (t.completed / maxT) * 80), color: blue });
    page.drawRectangle({ x: x + bw, y: base, width: bw, height: Math.max(1, (t.created / maxT) * 80), color: orange });
    page.drawText(t.day, { x, y: base - 10, size: 6, font, color: mute });
  });
  y = base - 24;
  text("Blue: completed · Orange: created", M, 8, font, mute); y -= 10;

  heading("Workload per person (open tasks)");
  bars(p.data.workload.map((w) => ({ label: w.name, a: w.onTrack, b: w.overdue })), blue, red, ["On track", "Overdue"]);

  heading("Overdue ageing");
  bars(p.data.ageing.map((a) => ({ label: a.bucket, a: a.count })));

  heading("Departments");
  bars(p.data.departments.map((d) => ({ label: d.name, a: d.assigned, b: d.completed })), blue, orange, ["Assigned", "Completed"]);

  heading("Top performers");
  p.data.top.forEach((r, i) => {
    ensure(16);
    text(`${i + 1}. ${r.name}`, M, 10, bold);
    text(`${r.points} pts`, M + 230, 10);
    text(`${r.completed} done`, M + 300, 10);
    text(r.onTimePct === null ? "on time n/a" : `${r.onTimePct}% on time`, M + 380, 10);
    y -= 16;
  });
  if (p.data.top.length === 0) text("No scores yet in this period.", M, 10, font, mute);

  pdf.getPages().forEach((pg, i, all) => pg.drawText(`KalamDesk · page ${i + 1} of ${all.length}`, { x: M, y: 24, size: 7, font, color: mute }));
  return pdf.save();
}
