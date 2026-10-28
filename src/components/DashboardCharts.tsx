"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/lib/dashboard";

const AXIS = { fontSize: 12, fill: "var(--viz-muted)" };

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--viz-ink2)" }}>
      <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{label}
    </span>
  );
}

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-lg" style={{ background: "var(--viz-surface)", borderColor: "var(--viz-grid)", color: "var(--viz-ink)" }}>
      <div className="mb-1 font-semibold">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span style={{ color: "var(--viz-ink2)" }}>{p.name}</span><b className="ml-auto pl-3">{p.value}</b>
        </div>
      ))}
    </div>
  );
}

function Card({ title, takeaway, legend, children, table, height = 256 }: {
  height?: number; title: string; takeaway: string; legend?: React.ReactNode; children: React.ReactNode; table: { head: string[]; rows: (string | number)[][] } }) {
  return (
    <section className="viz-root panel p-4" style={{ background: "var(--viz-surface)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--viz-ink)" }}>{title}</h2>
      <p className="mb-2 text-xs" style={{ color: "var(--viz-ink2)" }}>{takeaway}</p>
      {legend && <div className="mb-2 flex flex-wrap gap-4">{legend}</div>}
      <div className="w-full" style={{ height }}>{children}</div>
      <details className="mt-2 text-xs" style={{ color: "var(--viz-ink2)" }}>
        <summary className="cursor-pointer">View as table</summary>
        <table className="mt-2 w-full">
          <thead><tr>{table.head.map((h) => <th key={h} className="py-1 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="py-0.5 tabular-nums">{c}</td>)}</tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

const grid = <CartesianGrid vertical={false} stroke="var(--viz-grid)" />;

export default function DashboardCharts({ d }: { d: DashboardData }) {
  const totalDone = d.trend.reduce((s, x) => s + x.completed, 0);
  const totalNew = d.trend.reduce((s, x) => s + x.created, 0);
  const worst = d.workload[0];
  const totalOverdue = d.ageing.reduce((s, x) => s + x.count, 0);
  const old = d.ageing[2].count + d.ageing[3].count;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        title="Completion trend"
        takeaway={`${totalDone} tasks completed and ${totalNew} created in ${d.label.toLowerCase()}.`}
        legend={<><Swatch color="var(--series-1)" label="Completed" /><Swatch color="var(--series-2)" label="Created" /></>}
        table={{ head: ["Day", "Completed", "Created"], rows: d.trend.map((t) => [t.day, t.completed, t.created]) }}
      >
        <ResponsiveContainer>
          <LineChart data={d.trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            {grid}
            <XAxis dataKey="day" tick={AXIS} axisLine={{ stroke: "var(--viz-axis)" }} tickLine={false} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} cursor={{ stroke: "var(--viz-axis)" }} />
            <Line name="Completed" dataKey="completed" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--viz-surface)", strokeWidth: 2 }} />
            <Line name="Created" dataKey="created" stroke="var(--series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--viz-surface)", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title="Workload per person (open tasks)"
        takeaway={worst ? `${worst.name} carries the most: ${worst.onTrack + worst.overdue} open.` : "No open tasks."}
        legend={<><Swatch color="var(--series-1)" label="On track" /><Swatch color="var(--viz-critical)" label="Overdue" /></>}
        height={Math.max(256, d.workload.length * 30 + 40)}
        table={{ head: ["Person", "On track", "Overdue"], rows: d.workload.map((w) => [w.name, w.onTrack, w.overdue]) }}
      >
        <ResponsiveContainer>
          <BarChart data={d.workload} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }} barSize={14}>
            <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
            <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={110} interval={0} tick={{ ...AXIS, fill: "var(--viz-ink2)" }} axisLine={{ stroke: "var(--viz-axis)" }} tickLine={false} />
            <Tooltip content={<Tip />} cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }} />
            <Bar name="On track" dataKey="onTrack" stackId="a" fill="var(--series-1)" stroke="var(--viz-surface)" strokeWidth={2} />
            <Bar name="Overdue" dataKey="overdue" stackId="a" fill="var(--viz-critical)" stroke="var(--viz-surface)" strokeWidth={2} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title="Overdue ageing"
        takeaway={totalOverdue ? `${totalOverdue} overdue now, ${old} of them more than a week old.` : "Nothing is overdue."}
        table={{ head: ["Overdue by", "Tasks"], rows: d.ageing.map((a) => [a.bucket, a.count]) }}
      >
        <ResponsiveContainer>
          <BarChart data={d.ageing} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barSize={28}>
            {grid}
            <XAxis dataKey="bucket" tick={AXIS} axisLine={{ stroke: "var(--viz-axis)" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }} />
            <Bar name="Tasks" dataKey="count" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title="Departments"
        takeaway="Tasks due in the period and how many are done."
        legend={<><Swatch color="var(--series-1)" label="Assigned" /><Swatch color="var(--series-2)" label="Completed" /></>}
        height={Math.max(256, d.departments.length * 46 + 40)}
        table={{ head: ["Department", "Assigned", "Completed"], rows: d.departments.map((x) => [x.name, x.assigned, x.completed]) }}
      >
        <ResponsiveContainer>
          <BarChart data={d.departments} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }} barSize={12} barGap={2}>
            <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
            <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={110} interval={0} tick={{ ...AXIS, fill: "var(--viz-ink2)" }} axisLine={{ stroke: "var(--viz-axis)" }} tickLine={false} />
            <Tooltip content={<Tip />} cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }} />
            <Bar name="Assigned" dataKey="assigned" fill="var(--series-1)" radius={[0, 4, 4, 0]} />
            <Bar name="Completed" dataKey="completed" fill="var(--series-2)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
