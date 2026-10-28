import { fromIst, toIstParts } from "./time";

export type QuickAddParse = {
  title: string;
  assigneeToken: string | null; // "@Pooja" -> "Pooja"
  priority: "P1" | "P2" | "P3" | "P4" | null;
  dueAt: Date | null;
};

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Parses: "Raise invoice for Sunrise School @Pooja P1 tomorrow 5pm"
 * Pure function (takes `now`) so it is trivially testable. Times are IST.
 */
export function parseQuickAdd(input: string, now = new Date()): QuickAddParse {
  let text = ` ${input.trim()} `;
  let assigneeToken: string | null = null;
  let priority: QuickAddParse["priority"] = null;

  const at = / @([\w.]+)/.exec(text);
  if (at) {
    assigneeToken = at[1];
    text = text.replace(at[0], " ");
  }
  const pr = / (p[1-4]) /i.exec(text);
  if (pr) {
    priority = pr[1].toUpperCase() as QuickAddParse["priority"];
    text = text.replace(pr[0], " ");
  }

  // time: 5pm, 5:30pm, 17:00
  let hour: number | null = null;
  let minute = 0;
  const tm = / (?:at )?(\d{1,2})(?::(\d{2}))?\s?(am|pm) /i.exec(text) ?? / (?:at )?(\d{1,2}):(\d{2}) /.exec(text);
  if (tm) {
    hour = +tm[1];
    minute = tm[2] ? +tm[2] : 0;
    const ap = tm[3]?.toLowerCase();
    if (ap === "pm" && hour < 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
    text = text.replace(tm[0], " ");
  }

  // day: today / tomorrow / weekday name
  const p = toIstParts(now);
  let dayOffset: number | null = null;
  // whole words only, so "Sunrise School" is not read as "sun"
  const dm = / (today|tomorrow|tmrw|mon(?:day)?|tues?(?:day)?|wed(?:nesday)?|thu(?:rs?|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?) /i.exec(text);
  if (dm) {
    const w = dm[1].toLowerCase();
    if (w === "today") dayOffset = 0;
    else if (w === "tomorrow" || w === "tmrw") dayOffset = 1;
    else {
      const target = DAYS.indexOf(w.slice(0, 3));
      dayOffset = (target - p.dow + 7) % 7 || 7;
    }
    text = text.replace(dm[0], " ");
  }

  let dueAt: Date | null = null;
  if (dayOffset !== null || hour !== null) {
    const off = dayOffset ?? 0;
    dueAt = fromIst(p.y, p.m, p.d + off, hour ?? 18, minute);
    // a bare time already past today rolls to tomorrow
    if (dayOffset === null && dueAt.getTime() < now.getTime()) {
      dueAt = fromIst(p.y, p.m, p.d + 1, hour ?? 18, minute);
    }
  }

  return { title: text.replace(/\s+/g, " ").trim(), assigneeToken, priority, dueAt };
}
