// Scheduler entry point for hosts that run a Node script on a cron (e.g. Hostinger).
// Schedule ONE job every 15 minutes:   scripts/cron.js
//
// Each run: sends due/overdue reminders, and calls the morning (8:30 AM IST) and evening (7:00 PM IST)
// digests once their time has passed. The digests are idempotent per day on the server, so extra
// calls never send duplicates. The server's own timezone does not matter: IST is computed here.
//
// Needs CRON_SECRET and APP_URL in the environment (Hostinger loads them from the .env file).

const secret = process.env.CRON_SECRET;
const base = (process.env.APP_URL || "").replace(/\/$/, "");

if (!secret || !base) {
  console.error("Missing CRON_SECRET or APP_URL in the environment.");
  process.exit(1);
}

// IST = UTC+5:30, no daylight saving.
const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();

const jobs = [["reminders", "/api/cron/reminders"]];
if (minutes >= 8 * 60 + 30 && minutes < 12 * 60) jobs.push(["morning digest", "/api/cron/digest?type=morning"]);
if (minutes >= 19 * 60) jobs.push(["evening digest", "/api/cron/digest"]);

(async () => {
  let failed = false;
  for (const [name, path] of jobs) {
    try {
      const res = await fetch(base + path, {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(120_000),
      });
      console.log(`${new Date().toISOString()} ${name}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      if (!res.ok) failed = true;
    } catch (e) {
      console.error(`${name} failed:`, e instanceof Error ? e.message : e);
      failed = true;
    }
  }
  process.exitCode = failed ? 1 : 0;
})();
