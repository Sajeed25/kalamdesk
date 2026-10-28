import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DEV_PASSWORD = "kalamdesk123"; // dev/demo only — change before real use
const H = 3600 * 1000;
const at = (hours: number) => new Date(Date.now() + hours * H);

async function main() {
  const hash = await bcrypt.hash(DEV_PASSWORD, 10);
  const names = ["Accounts", "BD", "Marketing", "Training", "Product", "HR", "Tech"];
  const colors = ["#0ea5e9", "#f97316", "#ec4899", "#22c55e", "#8b5cf6", "#eab308", "#64748b"];
  const dept: Record<string, string> = {};
  for (const [i, name] of names.entries()) {
    dept[name] = (await db.department.upsert({ where: { name }, update: {}, create: { name, color: colors[i] } })).id;
  }

  type P = [string, string, string, string, string, string?, string?, string?]; // name, email, role, dept, office, title, type, managerEmail
  const people: P[] = [
    ["Arjun Reddy", "arjun@robokalam.test", "FOUNDER", "Product", "Hyderabad", "Co-founder & CEO"],
    ["Meera Rao", "meera@robokalam.test", "FOUNDER", "BD", "Hyderabad", "Co-founder & COO"],
    ["Kiran Kumar", "kiran@robokalam.test", "MANAGER", "BD", "Hyderabad", "BD Lead"],
    ["Suresh Babu", "suresh@robokalam.test", "MANAGER", "Training", "Warangal", "Head Trainer"],
    ["Pooja Sharma", "pooja@robokalam.test", "EMPLOYEE", "Accounts", "Hyderabad", "Accounts Executive", "FULL_TIME", "arjun@robokalam.test"],
    ["Ravi Teja", "ravi@robokalam.test", "EMPLOYEE", "BD", "Hyderabad", "Telecaller", "FULL_TIME", "kiran@robokalam.test"],
    ["Divya Lakshmi", "divya@robokalam.test", "EMPLOYEE", "BD", "Hyderabad", "BD Executive", "FULL_TIME", "kiran@robokalam.test"],
    ["Anil Goud", "anil@robokalam.test", "EMPLOYEE", "Training", "Warangal", "Trainer", "FULL_TIME", "suresh@robokalam.test"],
    ["Sneha Patel", "sneha@robokalam.test", "EMPLOYEE", "Marketing", "Hyderabad", "Designer", "FULL_TIME", "meera@robokalam.test"],
    ["Imran Khan", "imran@robokalam.test", "EMPLOYEE", "Tech", "Hyderabad", "Developer", "FULL_TIME", "arjun@robokalam.test"],
    ["Harsha Vardhan", "harsha@robokalam.test", "INTERN", "Marketing", "Hyderabad", "Marketing Intern", "INTERN", "sneha@robokalam.test"],
    ["Lavanya Devi", "lavanya@robokalam.test", "INTERN", "Training", "Warangal", "Training Intern", "INTERN", "suresh@robokalam.test"],
    ["Nikhil Varma", "nikhil@robokalam.test", "INTERN", "BD", "Hyderabad", "BD Intern", "INTERN", "kiran@robokalam.test"],
  ];

  const id: Record<string, string> = {};
  for (const [name, email, role, d, office, title] of people) {
    const u = await db.user.upsert({
      where: { email },
      update: {},
      create: { name, email, role, passwordHash: hash, departmentId: dept[d], consentAt: new Date() },
    });
    id[email.split("@")[0]] = u.id;
    await db.employeeProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id, office, title,
        employmentType: role === "INTERN" ? "INTERN" : "FULL_TIME",
        phone: "+91 90000 0" + String(Math.floor(1000 + Math.random() * 8999)),
        joinedOn: new Date("2024-06-01"),
        internStart: role === "INTERN" ? new Date("2026-09-01") : null,
        internEnd: role === "INTERN" ? new Date("2026-12-31") : null,
      },
    });
  }
  for (const [, email, , , , , , mgr] of people) {
    if (!mgr) continue;
    await db.employeeProfile.update({ where: { userId: id[email.split("@")[0]] }, data: { managerId: id[mgr.split("@")[0]] } });
  }

  if ((await db.task.count()) === 0) {
    type T = { title: string; by: string; to: string[]; d: string; p: string; c: number; due: number; status?: string; blocked?: string; self?: boolean; loc?: string; desc?: string };
    const tasks: T[] = [
      { title: "Raise invoice for Sunrise School", by: "arjun", to: ["pooja"], d: "Accounts", p: "P1", c: 2, due: 3, desc: "21C Lab instalment 2. Share PDF on email and WhatsApp." },
      { title: "Collect pending fee receipts — Oct", by: "arjun", to: ["pooja"], d: "Accounts", p: "P2", c: 3, due: -30, status: "IN_PROGRESS" },
      { title: "Call back 5 warm leads (Hyderabad schools)", by: "kiran", to: ["ravi"], d: "BD", p: "P2", c: 1, due: 5 },
      { title: "Follow up: Little Flower High demo feedback", by: "meera", to: ["divya"], d: "BD", p: "P1", c: 3, due: -5 },
      { title: "Franchise partner proposal draft", by: "meera", to: ["kiran"], d: "BD", p: "P2", c: 4, due: 48, status: "IN_REVIEW" },
      { title: "Design brochure for 21C Lab", by: "meera", to: ["sneha"], d: "Marketing", p: "P2", c: 4, due: 26, status: "IN_PROGRESS" },
      { title: "Create Diwali post image", by: "sneha", to: ["harsha"], d: "Marketing", p: "P3", c: 1, due: 8 },
      { title: "School visit — Vagdevi High School", by: "suresh", to: ["anil"], d: "Training", p: "P2", c: 3, due: 20, loc: "Vagdevi High School, Hanamkonda" },
      { title: "Prepare robotics worksheet, grade 6", by: "suresh", to: ["lavanya"], d: "Training", p: "P3", c: 2, due: -52, status: "BLOCKED", blocked: "Waiting for curriculum PDF from Product team" },
      { title: "Fix OTP delay on student portal", by: "arjun", to: ["imran"], d: "Tech", p: "P1", c: 4, due: 6, status: "IN_PROGRESS" },
      { title: "Update website footer links", by: "arjun", to: ["imran"], d: "Tech", p: "P4", c: 1, due: 100 },
      { title: "Today: 20 BD calls", by: "nikhil", to: ["nikhil"], d: "BD", p: "P3", c: 1, due: 7, self: true },
      { title: "Today: 2 school visits", by: "anil", to: ["anil"], d: "Training", p: "P3", c: 2, due: 9, self: true },
      { title: "Onboarding checklist for new interns", by: "meera", to: ["lavanya", "harsha"], d: "HR", p: "P3", c: 2, due: -2, status: "DONE" },
    ];
    for (const t of tasks) {
      const done = t.status === "DONE";
      await db.task.create({
        data: {
          title: t.title, description: t.desc ?? "", priority: t.p, complexity: t.c, dueAt: at(t.due),
          status: t.status ?? "TODO", blockedReason: t.blocked, selfInitiated: !!t.self, location: t.loc,
          departmentId: dept[t.d], creatorId: id[t.by], completedAt: done ? at(-3) : null,
          assignees: { create: t.to.map((x) => ({ userId: id[x] })) },
          activity: { create: { actorId: id[t.by], action: "CREATED", detail: t.self ? "Self-initiated" : "", createdAt: at(-30) } },
        },
      });
    }
  }
  console.log(`Seeded. Log in as arjun@robokalam.test / ${DEV_PASSWORD}`);
}

main().finally(() => db.$disconnect());
