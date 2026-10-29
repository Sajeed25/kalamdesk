// Builds docs/KalamDesk-Whats-New-v2.html: only what is NEW since the first user guide. Run: node docs/build-whatsnew.mjs
// Red numbers on each screenshot match the numbered list beside it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<kbd>$1</kbd>");

// reuse the look of the first guide
const src = fs.readFileSync(path.join(here, "build-guide.mjs"), "utf8");
const css = src.slice(src.indexOf("const css = `") + 13, src.indexOf("`;\n\nconst html")) + `
figure.phone{max-width:380px;margin-left:auto;margin-right:auto}
.new{display:inline-block;margin-left:8px;padding:2px 9px;border-radius:999px;background:#dcfce7;color:#166534;font:700 11px/1.6 system-ui;letter-spacing:.08em;text-transform:uppercase;vertical-align:middle}
table.glance{width:100%;border-collapse:collapse;font-size:14px}.glance td,.glance th{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.glance th{background:#f4f5f8;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute)}
ol.todo{margin:0;padding-left:22px}ol.todo li{margin:8px 0}
.warn{margin-top:14px;padding:14px 18px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12}
`;

const roleLabel = { ALL: "Everyone", LEAD: "Managers & founders", FOUNDER: "Founders", OWNER: "Group owners" };

const parts = [
  {
    id: "phone", title: "Install KalamDesk as a phone app", lead: "Open it from your home screen in one tap, full screen, with a layout built for thumbs. Works on Android, iPhone and laptops. No app store needed.", isNew: true,
    steps: [
      {
        title: "A layout made for phones", who: "ALL", time: "1 min", img: "v2-phone-myday", phone: true,
        intro: "On a phone, the left menu becomes a bar along the bottom. The three pages you use most are one tap away, and everything else is under **More**.",
        callouts: [
          "**My Day.** Your home screen. (Managers and founders get **Desk** here too.)",
          "**Stand-up.** File your daily update.",
          "**The big + button.** Add a task from any screen, in ten seconds. On a laptop, press `N` instead.",
          "**Board.** Your tasks as cards.",
          "**More.** Opens every other page, in one sheet (next step).",
        ],
        tips: ["The bar stays put while you scroll, and it keeps clear of the notch and the home bar on newer phones.", "The My Day banner is shorter on a phone, so your tasks come into view sooner."],
      },
      {
        title: "The More sheet: every page in one place", who: "ALL", time: "1 min", img: "v2-phone-more", phone: true,
        intro: "Tap **More** and a sheet slides up with all the pages, grouped just like the desktop menu.",
        callouts: [
          "**Your card.** Your name, level and points. If you look after several organisations, the organisation switcher sits just above it.",
          "**A page tile.** Tap any tile, for example **Leave**, to open that page. The sheet closes by itself.",
          "**Performance and Company groups.** Scores, Challenges, Incentives, Referrals, People, Leads, Visits, Expenses and more. Scroll down for **Settings**, **Sign out** and the install card.",
        ],
        tips: ["Tap the dark area above the sheet, or choose a page, to close it."],
      },
      {
        title: "Install on Android or a laptop", who: "ALL", time: "1 min", img: "v2-install-desktop",
        intro: "On Chrome or Edge, KalamDesk offers to install itself. You will see the button in two places.",
        callouts: [
          "**The Install app button** at the top of every screen. On a phone it shows as a small download arrow.",
          "**Install the app** on the **Settings** page, under a short explanation.",
        ],
        tips: ["Tap it, then confirm **Install**. KalamDesk now has its own icon on your home screen (or desktop) and opens full screen with no browser bar.", "Don't see the button? Open the browser menu (three dots) and choose **Install app** or **Add to Home screen**.", "Press and hold the icon on Android for shortcuts: **Add a task**, **My Day** and **Daily update**.", "The icon shows a red number when you have unread notifications, on phones that support it.", "Installing needs the website to start with **https**, which your hosting already provides."],
      },
      {
        title: "Install on iPhone or iPad", who: "ALL", time: "1 min", img: "v2-install-iphone", phone: true,
        intro: "Safari has no install button, so KalamDesk shows the steps instead. Open **Settings** in Safari and tap **Show me how**.",
        callouts: [
          "**The heading.** *Add KalamDesk to your iPhone*.",
          "**The three steps.** Tap the **Share** button (the square with an arrow), then **Add to Home Screen**, then **Add**.",
          "**Got it.** Closes the help.",
        ],
        tips: ["Open KalamDesk from the new home-screen icon from now on. That is also what makes lock-screen alerts possible on iPhone."],
      },
      {
        title: "When the phone loses its connection", who: "ALL", time: "1 min", img: "v2-offline", phone: true,
        intro: "If you are offline, KalamDesk says so plainly instead of showing a browser error.",
        callouts: ["**You are offline.** Nothing you did earlier has been lost.", "**Try again.** Reloads the page once your connection is back."],
        tips: ["While you are offline, an orange bar at the top reminds you that changes will not save.", "For privacy, KalamDesk never stores your tasks or personal data on the phone. Only its icons and styling are kept for speed."],
      },
    ],
  },
  {
    id: "push", title: "Lock-screen notifications", lead: "New tasks, blockers, sent-back work, reminders and kudos appear as a normal alert on your phone, even when KalamDesk is closed. Tap one and KalamDesk opens on that task.", isNew: true,
    steps: [
      {
        title: "Turn alerts on from My Day", who: "ALL", time: "1 min", img: "v2-push-prompt", phone: true,
        intro: "Until you decide, My Day shows a small card offering to turn alerts on.",
        callouts: ["**Never miss a task.** The offer.", "**Turn on alerts.** Tap it, then tap **Allow** when your phone asks."],
        tips: ["**Not now** (next to the button) hides the card on this phone. You can still turn alerts on later in Settings.", "Each phone or browser is set up separately, so turn it on everywhere you want alerts."],
      },
      {
        title: "Or turn them on in Settings", who: "ALL", time: "1 min", img: "v2-push-off", phone: true,
        intro: "Open **Settings** (on a phone: **More → Settings**) and find **Lock-screen notifications**.",
        callouts: ["**Turn on for this phone.** Tap it, then **Allow**.", "**The card.** It explains what you will get, and it tells you if something stops it working on this device."],
        tips: ["**iPhone and iPad:** alerts work once KalamDesk is on your Home Screen (iOS 16.4 or newer). The card tells you if you still need to do that.", "Blocked it by mistake? Open your phone's browser site settings for KalamDesk, set **Notifications** to **Allow**, and reload."],
      },
      {
        title: "Check that it works", who: "ALL", time: "1 min", img: "v2-push-on", phone: true,
        intro: "Once it is on, the card changes. Send yourself a test to be sure.",
        callouts: ["**On for this phone.** Alerts are active here.", "**Send me a test.** A test alert should appear on your lock screen within seconds.", "**Turn off.** Stops alerts on this phone. Nothing else changes."],
        tips: [
          "**You will get alerts for:** a new task, a task marked blocked, work sent back, reminders (due in 2 hours, overdue), approvals and kudos. Long digests stay in email.",
          "Tapping an alert opens KalamDesk on that exact task.",
          "The alert shows the task title on your lock screen. If that is private for you, keep alerts off, or hide previews in your phone's own notification settings.",
          "Your phone's own settings can switch KalamDesk alerts off at any time.",
        ],
      },
    ],
  },
  {
    id: "files", title: "Photos and files you can actually open", lead: "Attachments now show as thumbnails, open in the browser, and are stored safely so they are no longer lost when the website is updated.", isNew: true,
    steps: [
      {
        title: "View, download and attach", who: "ALL", time: "2 min", img: "v2-files",
        intro: "Open any task and scroll to **Attachments**.",
        callouts: [
          "**A photo thumbnail.** Click it to see the photo full size in a new tab.",
          "**View.** Opens a photo or a PDF in the browser. For Word, Excel and other files it says **Open** and downloads them.",
          "**Download.** Saves a copy to your device.",
          "**A document tile.** PDFs and other files show their type instead of a picture.",
          "**Attach file.** Add photos, PDFs, Office files or CSV, up to 10 MB each.",
        ],
        tips: [
          "**Why this changed:** files used to be kept inside the website's own folder, which is replaced every time the site is updated, so older attachments could stop opening. They are now kept in the database, which updates do not touch and your backups include.",
          "**Files uploaded before this change may be gone.** If one will not open, attach it again.",
          "KalamDesk now checks that a file really is what it claims to be. A web page renamed to `.jpg` is refused.",
          "Expense receipts open the same way: click **view receipt** on a claim.",
        ],
      },
    ],
  },
  {
    id: "reports", title: "Reports for visits, training sessions and workshops", lead: "Record what was covered and how many students came, for school visits, training sessions and workshops.", isNew: true,
    steps: [
      {
        title: "Fill in the report", who: "ALL", time: "3 min", img: "v2-report-form",
        intro: "Every task now has a **+ Add a visit, session or workshop report** button. It opens straight away on visit tasks.",
        callouts: [
          "**What kind of activity was it?** School visit, Training session or Workshop. KalamDesk guesses from the task title, so you rarely need to change it.",
          "**Topics covered.** For example *Sensors, Arduino basics, line-follower build*.",
          "**Students attended.** The number of students who took part.",
          "**Teachers present** (optional).",
          "**Class or grade** (optional), for example *Grades 6 to 8*.",
          "**How did it go?** Great, Good, Needs follow-up or Problem. A **Problem** alerts the founders at once.",
          "**Save.** The button names the kind, for example **Save session report**.",
        ],
        tips: ["Below the form, **What happened?** and **Follow-up needed** are still there. Add photos with **Attach file** on the same task.", "Saved by mistake or something changed? Click **Edit** on the saved report."],
      },
      {
        title: "The saved report", who: "ALL", time: "1 min", img: "v2-report-saved",
        intro: "After you save, the form is replaced by a neat summary at the top of the task.",
        callouts: ["**How it went.** The coloured tag.", "**Students attended.** Next to it: teachers and class or grade.", "**Topics covered.** What the session was about.", "**Edit.** Change anything and save again."],
        tips: ["The follow-up you wrote is shown underneath, and founders are told when a report says *Needs follow-up* or *Problem*."],
      },
      {
        title: "The Visits page: totals at a glance", who: "ALL", time: "1 min", img: "v2-visits",
        intro: "**Visits** in the menu is now **Visits, sessions and workshops**. It lists every report you can see, newest first.",
        callouts: ["**Reports this week.**", "**Students reached** this week.", "**The kind of activity.** Visit, Session or Workshop.", "**Topics covered**, students, teachers and class on every report."],
        tips: ["Beside them, **sessions and workshops** counts those two kinds this week, and **need attention** counts reports that need follow-up.", "Employees see their own reports. Managers see their team's. Founders see everyone's."],
      },
    ],
  },
  {
    id: "access", title: "What employees and interns see", lead: "Employees and interns now see only what they need: their own work, and a names-only directory of colleagues.", isNew: true,
    steps: [
      {
        title: "A names-only People directory", who: "ALL", time: "1 min", img: "v2-people-employee",
        intro: "Employees and interns can still see who works in their organisation, so they can add a teammate to a task. Contact details are private.",
        callouts: ["**Name.** Every active person in your organisation.", "**Dept.** Their department.", "**The note.** *Contact details are visible to managers and founders only.* Email, phone, office and who reports to whom are hidden."],
        tips: ["Managers and founders keep the full table.", "Only people in your own organisation are ever listed."],
      },
      {
        title: "Simpler filters for employees and interns", who: "ALL", time: "1 min", img: "v2-board-employee",
        intro: "On **Board**, **List** and **Calendar**, employees and interns only ever see their own tasks, so the person and department pickers are gone.",
        callouts: ["**Priority.** P1 to P4.", "**Tag.** Type a tag to narrow the view.", "**Apply.**"],
        tips: ["Nothing else about your own work changes."],
      },
      {
        title: "What managers and founders still have", who: "LEAD", time: "1 min", img: "v2-board-founder",
        intro: "Managers and founders get two extra pickers, to look at one person or one department, or at the whole team.",
        callouts: ["**Person.** Choose someone, or Everyone.", "**Department.** Choose a department, or All."],
        tips: ["Managers see their own team. Founders see the whole organisation."],
      },
    ],
  },
  {
    id: "storage", title: "Storage: kept tidy, with your approval", lead: "The database has a size limit (2 GB by default). KalamDesk watches it, asks a group owner before deleting anything, and always removes the oldest first.", isNew: true,
    steps: [
      {
        title: "The warning", who: "OWNER", time: "1 min", img: "v2-storage-banner",
        intro: "At **80% full** group owners get a notice. At **90% full** a red banner appears at the top of every screen, and a request arrives by bell and email once a week.",
        callouts: ["**The red banner.** It shows how full storage is. Nothing is deleted. Click it to review.", "**Organisations** in the menu. The Storage panel is at the bottom of that page."],
        tips: ["Only group owners see the banner and the Storage panel. The database is shared by every organisation.", "The screenshots use a tiny demo limit so the warning triggers. On your site the limit is 2 GB."],
      },
      {
        title: "Review and approve", who: "OWNER", time: "3 min", img: "v2-storage-panel",
        intro: "The **Storage** panel shows the usage, and lists exactly what an approved clean-up would remove.",
        callouts: [
          "**The status.** *Healthy*, *Getting full* or *Approval needed*.",
          "**The bar.** How much of the limit is used.",
          "**What would be removed.** Old notifications, files that nothing uses, and attachments on tasks finished long ago, oldest first. Nothing is removed yet.",
          "**Approve clean-up.** Deletes exactly that list, then stops once usage is back under 80%.",
          "**Remove only the junk.** The harmless part only: old notifications and unused files. Available any time.",
          "**Auto-rotate (overwrite the oldest).** Optional. Tick it and KalamDesk makes room by itself at 90%, always removing the **oldest** first, so new uploads take the place of the oldest ones. Off by default.",
        ],
        tips: [
          "**Never removed automatically:** people, tasks, scores, incentives, leave, leads, expense claims and their receipts, ID documents, bank details, and anything on a task that is still open. Files younger than 30 days are never touched.",
          "Want a copy first? Use the company data export. It saves your records but not the photos.",
          "Every clean-up is written to the audit log with who approved it, and the other group owners are told.",
        ],
      },
      {
        title: "After the clean-up", who: "OWNER", time: "1 min", img: "v2-storage-done",
        intro: "When it finishes, the panel reports what happened.",
        callouts: ["**The result.** How many old items were removed and the new size.", "**Healthy** again.", "**The bar** is back under the limit."],
        tips: ["Each affected task shows a line in its history: *old attachments were removed automatically to free up storage*.", "If usage is still over the limit, the rest is data that is deliberately never removed. Export what you need and ask your host about more space."],
      },
    ],
  },
];

let n = 0;
const stepHtml = (s) => {
  n += 1;
  return `
<section class="step" id="s${n}">
  <header><span class="num">${String(n).padStart(2, "0")}</span><div><h3>${md(s.title)}</h3><p class="meta"><span class="who who-${s.who}">${roleLabel[s.who]}</span><span>About ${s.time}</span></p></div></header>
  <p class="intro">${md(s.intro)}</p>
  <figure${s.phone ? ' class="phone"' : ""}><img src="img/${s.img}.png" alt="${esc(s.title)}"></figure>
  ${s.callouts.length ? `<ol class="callouts">${s.callouts.map((c) => `<li>${md(c)}</li>`).join("")}</ol>` : ""}
  ${s.tips.length ? `<aside class="tips"><b>Good to know</b><ul>${s.tips.map((t) => `<li>${md(t)}</li>`).join("")}</ul></aside>` : ""}
</section>`;
};

const partsHtml = parts.map((p, i) => `
<section class="part" id="p-${p.id}">
  <div class="part-title"><span>New · Part ${i + 1}</span><h2>${esc(p.title)}</h2><p>${md(p.lead)}</p></div>
  ${p.steps.map(stepHtml).join("")}
</section>`).join("");

const toc = parts.map((p, i) => `<li><a href="#p-${p.id}"><b>Part ${i + 1}</b> ${esc(p.title)}</a></li>`).join("") + `<li><a href="#checklist"><b>Extra</b> Upgrade checklist for whoever looks after the website</a></li>`;

const glance = [
  ["Install as a phone app", "Android, iPhone, laptops. Bottom bar, More sheet, offline notice, icon badge.", "Everyone"],
  ["Lock-screen notifications", "New tasks, blockers, reminders and kudos on the lock screen. Opt-in, per phone.", "Everyone"],
  ["Photos and files you can open", "Thumbnails, View and Download. Files kept safely in the database.", "Everyone"],
  ["Visit, session and workshop reports", "Topics covered, students attended, teachers, class. New Visits page totals.", "Everyone"],
  ["Least-privilege access", "Names-only People directory and simpler filters for employees and interns.", "Employees, interns"],
  ["Storage clean-up with approval", "Warns at 80%, asks at 90%, oldest first. Optional Auto-rotate.", "Group owners"],
];

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KalamDesk Version 2: What's New</title><style>${css}</style></head><body>
<section class="cover"><div class="logo">K</div>
<div><h1>What's new in<br>KalamDesk 2.0</h1><p class="sub">Only the new features since the first user guide, explained step by step, screen by screen.</p></div>
<div class="foot"><span>Version 2.0 · 29 October 2026</span><span>Screenshots use demo data</span></div></section>

<div class="wrap">
<section class="page"><h2>Version 2.0 at a glance</h2><p class="lead">Everything in the first guide still applies. This edition covers six additions.</p>
<div class="card"><table class="glance"><thead><tr><th>New in 2.0</th><th>What it does</th><th>For</th></tr></thead><tbody>${glance.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table></div>
<div class="how" style="margin-top:20px"><div class="card"><p><b>How to read this guide</b></p><p>Each step has a screenshot. The red numbers on the screenshot match the numbered list under it. The <span class="hl">yellow highlight</span> shows what to look at or tap.</p></div>
<div class="card"><p><b>Who is each step for?</b></p><p class="who-legend"><span class="who">Everyone</span><span class="who who-LEAD">Managers &amp; founders</span><span class="who who-OWNER">Group owners</span></p><p>Employees and interns need Parts 1 to 5 only.</p></div></div></section>
<section class="page"><h2>Contents</h2><ul class="toc">${toc}</ul></section>
${partsHtml}
<section class="part" id="checklist">
  <div class="part-title"><span>Extra</span><h2>Upgrade checklist</h2><p>For the person who looks after the website on Hostinger. Do these in order, before staff try the new features.</p></div>
  <section class="step"><header><span class="num">✓</span><div><h3>Putting Version 2.0 live</h3><p class="meta"><span class="who who-FOUNDER">Whoever manages Hostinger</span><span>About 10 minutes</span></p></div></header>
    <ol class="todo">
      <li><b>Back up first.</b> In hPanel open <b>phpMyAdmin</b>, choose your database, and use <b>Export</b>.</li>
      <li>In phpMyAdmin, open the <b>SQL</b> tab and run <code>prisma/phase6-push-upgrade.sql</code> (paste all of it, click Go). It adds two tables for lock-screen notifications. Run it <b>once</b>.</li>
      <li>Run <code>prisma/phase7-files-reports-upgrade.sql</code> the same way. It adds the file table and four columns for the new reports. Run it <b>once</b>.</li>
      <li><b>Redeploy</b> from GitHub in Hostinger.</li>
      <li>Open <code>your-site/api/health</code> and check <b>pushSchema: true</b> and <b>filesInDatabase: true</b>.</li>
      <li>Optional: add <code>DB_LIMIT_MB</code> in the environment variables to change the 2 GB storage limit (for example <code>1024</code>). <code>STORAGE_AUTOCLEAN=off</code> switches Auto-rotate off for good.</li>
      <li>Tell the team: <b>install the app</b>, <b>turn on lock-screen alerts</b>, and <b>re-attach</b> any file that no longer opens.</li>
    </ol>
    <div class="warn"><b>Heads-up:</b> files saved before this version may already have been lost when the website was last updated. They cannot be recovered. New uploads are safe from now on. The storage clean-up needs no database step of its own.</div>
  </section>
</section>
<p class="end">KalamDesk 2.0 · If something here does not match what you see, tell your founder so the guide can be fixed.</p>
</div></body></html>`;

fs.writeFileSync(path.join(here, "KalamDesk-Whats-New-v2.html"), html);
console.log("steps:", n, "bytes:", html.length);
