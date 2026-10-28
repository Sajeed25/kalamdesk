import { db } from "./db";
import { istDateKey, toIstParts } from "./time";

export type Celebration = { userId: string; name: string; kind: "BIRTHDAY" | "ANNIVERSARY" | "INTERN_END"; text: string };

const md = (m: number, d: number) => `${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Today's good news: birthdays (only if the person added theirs), work anniversaries, and internship end days coming up. */
export async function celebrationsFor(now = new Date()): Promise<Celebration[]> {
  const p = toIstParts(now);
  const today = md(p.m, p.d);
  const out: Celebration[] = [];
  try {
    const [birthdays, profiles] = await Promise.all([
      db.personDate.findMany({ where: { birthday: today }, select: { userId: true } }),
      db.employeeProfile.findMany({ where: { OR: [{ joinedOn: { not: null } }, { internEnd: { not: null } }], user: { active: true } }, select: { userId: true, joinedOn: true, internEnd: true, user: { select: { name: true, role: true } } } }),
    ]);
    const users = new Map((await db.user.findMany({ where: { active: true, id: { in: birthdays.map((b) => b.userId) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
    for (const b of birthdays) if (users.has(b.userId)) out.push({ userId: b.userId, name: users.get(b.userId)!, kind: "BIRTHDAY", text: `It's ${users.get(b.userId)}'s birthday today! 🎂` });
    const todayKey = istDateKey(now);
    for (const pr of profiles) {
      if (pr.joinedOn) {
        const j = toIstParts(pr.joinedOn);
        const years = p.y - j.y;
        if (md(j.m, j.d) === today && years >= 1) out.push({ userId: pr.userId, name: pr.user.name, kind: "ANNIVERSARY", text: `${pr.user.name} completes ${years} year${years > 1 ? "s" : ""} with the team today! 🎉` });
      }
      if (pr.internEnd && pr.user.role === "INTERN") {
        const left = Math.round((Date.parse(`${istDateKey(pr.internEnd)}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 864e5);
        if (left >= 0 && left <= 7) out.push({ userId: pr.userId, name: pr.user.name, kind: "INTERN_END", text: left === 0 ? `Today is ${pr.user.name}'s last day as an intern. Say thank you! 💙` : `${pr.user.name}'s internship ends in ${left} day${left > 1 ? "s" : ""}.` });
      }
    }
  } catch { /* new tables not created yet: no celebrations, no crash */ }
  return out;
}
