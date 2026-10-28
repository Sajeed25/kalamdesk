// Builds docs/KalamDesk-User-Guide.html from the screenshots in docs/img (run: node docs/build-guide.mjs).
// Every numbered red marker in a screenshot has the same number in the list beside it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<kbd>$1</kbd>");

/** who: ALL | LEAD (managers and founders) | FOUNDER | OWNER (group owners) */
const parts = [
  {
    id: "start", title: "Start here", lead: "Everything you need on your very first day: your invitation, signing in, and finding your way around.",
    steps: [
      {
        title: "Accept your invitation and choose a password", who: "ALL", time: "2 min", img: "02-set-password",
        intro: "When a founder adds you, KalamDesk emails you a **Welcome to KalamDesk** message. The link in it works once and expires after 3 days.",
        callouts: [
          "**New password.** Choose at least 8 characters. A short sentence you will remember is better than a clever word, for example `blue-chai-at-6pm`.",
          "**Confirm password.** Type the same password again so a typo cannot lock you out.",
          "**Set password.** Click it. You are signed in straight away.",
        ],
        tips: ["The link expired or stopped working? Ask your founder to open **People → your name → Edit** and send a new invitation.", "Never share your password. Nobody at the company will ever ask you for it."],
      },
      {
        title: "Sign in on any day", who: "ALL", time: "1 min", img: "01-login",
        intro: "Open the KalamDesk address your company gave you in any browser, on a laptop or a phone. Bookmark it, or add it to your phone's home screen.",
        callouts: [
          "**Email.** Use your official company email, the same one the invitation was sent to.",
          "**Password.** The one you chose. If you turned on two-step sign-in, you will be asked for a 6-digit code on the next screen.",
          "**Sign in.** Click it, or press Enter on your keyboard.",
          "**Forgot password?** Click it, type your email, and we send a link to choose a new one. It works once and lasts 1 hour.",
        ],
        tips: ["Five wrong passwords in a row pauses sign-in for 10 minutes. Wait, then try again, or use **Forgot password?**.", "You are signed out automatically after 12 hours, so sign in again each day."],
      },
      {
        title: "Read and accept the privacy notice", who: "ALL", time: "1 min", img: "03-consent",
        intro: "The first time you sign in, a short notice appears. It tells you what KalamDesk stores about you and why.",
        callouts: [
          "**The notice.** We keep your name, contact details, work records and task performance only to assign work, measure delivery fairly and run incentives. Bank and ID details are encrypted and only founders can open them.",
          "**I understand and agree.** Click it to continue. You cannot use the app until you do.",
        ],
        tips: ["You can download everything we hold about you, or ask for a correction or deletion, any time from **Settings → Your data and privacy**."],
      },
      {
        title: "Your first day: what you will see", who: "ALL", time: "3 min", img: "04-first-day",
        intro: "A brand-new account is quiet, and that is normal. This is **My Day**, your home screen. It fills up as soon as you are given work.",
        callouts: [
          "**I'm in.** Tap this when you start work. It records your attendance for the day. Tap **I'm out** when you finish.",
          "**Your 30-second stand-up.** Click **Fill it in** to tell the team what you finished and what is pending. Do this every working day.",
          "**Weekly goal.** A gentle target of how many tasks to finish this week. The bar fills as you finish work.",
          "**Plan my day.** Nothing assigned yet? Add your own tasks here. Self-started work shows up on the founders' desk and earns bonus points once accepted.",
        ],
        tips: ["Your first three actions on day one: tap **I'm in**, file your first stand-up, and add one task of your own."],
      },
      {
        title: "Find your way around: the left menu", who: "ALL", time: "3 min", img: "05-sidebar",
        intro: "The dark menu on the left is on every screen (on a phone it is the bar along the bottom, which scrolls sideways). It has three groups.",
        callouts: [
          "**Your organisation** at the top. If you work for more than one organisation and have been given access, click it to switch.",
          "**My Day.** Your home screen: what is due, what is overdue, and what to do next.",
          "**Scores.** The leaderboard: points this week, this month and all time.",
          "**People.** Names, roles and contact details of your colleagues. You only ever see people in your own organisation.",
          "**Group headings.** *My work*, *Performance* and *Company* group everything. Items you cannot use are simply not shown to you.",
          "**+ New task.** Add a task from any screen. Tip: press `N` anywhere on your keyboard.",
          "**The bell.** Your notifications: tasks assigned to you, comments, kudos and reminders. A red dot means something is new.",
          "**Settings and Sign out.** Bottom left. Your level, points and a progress bar to the next level are shown just above.",
        ],
        tips: ["Your **level** goes up as you earn points. It is a bit of fun, and it also unlocks badges."],
      },
    ],
  },
  {
    id: "day", title: "Your working day", lead: "The routine that keeps you, your manager and your scores on track.",
    steps: [
      {
        title: "My Day: your home screen", who: "ALL", time: "3 min", img: "06-my-day",
        intro: "Open **My Day** first thing every morning. Everything due today, and anything overdue, is here.",
        callouts: [
          "**The greeting banner.** Shows your streak (days in a row you filed a stand-up), points this week and your level. The ring shows tasks done today.",
          "**I'm in / I'm out.** Records your attendance. It is a single tap.",
          "**Focus now.** The one task to do next. **Mark done** finishes it. **Open details** shows the full task.",
          "**The round tick.** The quick way to finish any task in your list.",
          "**The status menu.** Change a task between To Do, In Progress, Blocked, In Review and Done without opening it.",
          "**Weekly goal.** How many tasks you have finished against this week's goal.",
          "**Your week in numbers.** Last week's points, tasks done, on-time rate, stand-ups and kudos, and your rank among your peers.",
        ],
        tips: ["Red **Overdue** items come first. If something is stuck, set its status to **Blocked** and say why, so it does not count against you as silently late.", "Some tasks need proof before they can be finished. You will be asked to add a note or file."],
      },
      {
        title: "Add a task in ten seconds", who: "ALL", time: "2 min", img: "07-quick-add",
        intro: "Click **+ New task**, or press `N` anywhere. Type naturally; KalamDesk reads it for you.",
        callouts: [
          "**Type the task in plain words.** Example: `Raise invoice for Sunrise School @Pooja P1 tomorrow 5pm`. It understands `@name` for who, `P1` to `P4` for priority, and words like `today`, `tomorrow`, `tue` or `5pm` for the deadline.",
          "**For: me.** Shows who the task is for. Employees and interns can add tasks for themselves. Asking someone else to do something sends them a *request* they can see.",
          "**Priority.** P1 is urgent, P2 high, P3 normal, P4 when free. P3 is the default.",
          "**Add task.** Saves it, or press Enter.",
          "**Full form.** Want a description, checklist, location or exact date? Open the full form instead.",
        ],
        tips: ["Self-started tasks are marked *Self-initiated*. When a founder accepts one, you earn an initiative bonus."],
      },
      {
        title: "Open a task: status, checklist, files and comments", who: "ALL", time: "4 min", img: "08-task",
        intro: "Click any task title to open it. This is where the work gets done and recorded.",
        callouts: [
          "**Status.** To Do, In Progress, Blocked, In Review or Done. Moving to **Blocked** asks for a reason, and the person who assigned it is told straight away.",
          "**Add a step.** Break the task into a checklist. Tick steps off as you go.",
          "**Attach file.** Photos, PDFs, Office files and CSV, up to 10 MB each.",
          "**Comment box.** Ask questions or give updates. Type `@name` to mention a colleague and they are notified.",
          "**Activity.** An automatic history of who changed what and when. It cannot be edited.",
        ],
        tips: ["Tasks that need approval go to **In Review**. A manager or founder approves or sends them back with a note.", "Finishing a task on time earns the most points; finishing late earns fewer. See *Scores*."],
      },
      {
        title: "File your daily stand-up", who: "ALL", time: "2 min", img: "09-update",
        intro: "Every working day, spend two minutes here. It keeps your streak alive, and it means your manager never has to chase you for a status.",
        callouts: [
          "**What did you finish today?** Short and specific beats long: `20 calls, 2 school visits, invoice for Sunrise School`.",
          "**What is pending?** What you will pick up tomorrow.",
          "**Any obstacles?** Anything slowing you down. Founders see these, and it is the fastest way to get help.",
          "**Save.** The button reads **Update again** if you have already filed today, and you can edit as often as you like until midnight.",
        ],
        tips: ["Missed a day? The streak resets, but nothing is lost. Start a new one today.", "Short on time? If your company has turned on WhatsApp, send `UPDATE <what you did>` to the KalamDesk number instead."],
      },
      {
        title: "Board, List and Calendar: three ways to see your work", who: "ALL", time: "4 min", img: "10-board",
        intro: "**Board** shows tasks as cards in columns. Drag a card to another column to change its status.",
        callouts: [
          "**Filters.** Narrow by person, department, priority or tag. Employees see their own work; managers see their team.",
          "**A task card.** Click it to open the task. The coloured edge shows priority.",
          "**To Do column.** Work that has not started.",
          "**Done column.** Finished work. Drop a card here to finish it.",
        ],
        tips: ["Prefer a table? Use **List**. Prefer a month view? Use **Calendar** (next two screens)."],
      },
      {
        title: "List: sort and filter every task", who: "ALL", time: "2 min", img: "11-list",
        intro: "**List** shows the same tasks as a sortable table. It is the best view for searching and for bulk work.",
        callouts: [
          "**Priority filter.** Also filter by person, department or tag, then click Apply.",
          "**Apply.** Run your filters.",
          "**Column headings.** Click TASK, PRIORITY, STATUS or DUE to sort.",
          "**A row.** Click to open the task.",
        ],
        tips: ["Managers and founders can tick several rows and change status, priority or assignee for all of them at once."],
      },
      {
        title: "Calendar: deadlines by date", who: "ALL", time: "1 min", img: "12-calendar",
        intro: "See every deadline laid out across the month.",
        callouts: ["**Previous month.**", "**Next month.**", "**A task.** Click to open it. Overdue tasks are shown in red."],
        tips: ["Want these deadlines in Google, Apple or Outlook calendar? See **Settings → Calendar link**."],
      },
      {
        title: "Notifications: the bell", who: "ALL", time: "1 min", img: "22-bell",
        intro: "KalamDesk tells you when something needs you: a new task, a comment, a task sent back, a deadline in 2 hours, or kudos from a colleague.",
        callouts: ["**The bell.** A red dot means something is new. Click to open the list.", "**A notification.** Click it to jump straight to the task or page. It is then marked as read."],
        tips: ["Important notifications also arrive by email, and by WhatsApp if you turned that on in Settings."],
      },
    ],
  },
  {
    id: "work", title: "Leave, visits, leads and expenses", lead: "The everyday business tools. Use them instead of messages and spreadsheets, so everything lives in one place.",
    steps: [
      {
        title: "Ask for leave and mark attendance", who: "ALL", time: "3 min", img: "13-leave",
        intro: "Open **Leave** from the menu. Your manager and the founders are told as soon as you ask.",
        callouts: [
          "**I'm in / I'm out.** Your daily attendance. Tap **I'm in** when you start and **I'm out** when you finish.",
          "**Type of leave.** Casual, Sick, Unpaid or Other.",
          "**Cover person.** Choose a colleague to cover for you. New tasks given to you while you are away are shared with them, so nothing sits idle.",
          "**Dates.** Choose the first and last day. Leave is counted in calendar days.",
          "**Ask for leave.** Sends the request. You will be notified when it is approved or declined.",
          "**Cancel leave.** Changed your plans? Cancel a pending or approved request here.",
        ],
        tips: ["Ask as early as you can. Leave longer than 60 days needs a conversation with a founder.", "While you are on approved leave, your name shows an *Away until* tag on the founders' desk."],
      },
      {
        title: "Record a school visit", who: "ALL", time: "3 min", img: "45-visit",
        intro: "For field work such as school visits, open the visit task right after you finish. Two minutes now saves a long phone call later.",
        callouts: [
          "**Location.** The place from the task. Tap it to open the address in Google Maps.",
          "**How did it go?** Great, Good, Needs follow-up or Problem. A **Problem** alerts the founders immediately.",
          "**What happened?** Who you met, what you showed, how students reacted.",
          "**Save visit report.** You can come back and edit it.",
        ],
        tips: ["Add photos with **Attach file** on the same task. The **Visits** page in the menu lists every report.", "Fill in **How many people attended** and **Follow-up needed** too. They feed the reports founders see."],
      },
      {
        title: "Track your leads", who: "ALL", time: "4 min", img: "46-add-lead",
        intro: "**Leads** is your list of schools and contacts you are working to win. Log every call so nothing is forgotten.",
        callouts: [
          "**Contact name.** Who you spoke to. Only name and, usually, the school are required.",
          "**School or organisation.**",
          "**Phone** (and email, deal size and source are optional). Tap a phone number later to call.",
          "**Add lead.** Saves it as a *New* lead.",
          "**Filters.** *Follow-up due* shows who you promised to call back today.",
          "**Log a call.** Record the outcome (connected, no answer, call back, not interested, wrong number) and set a follow-up date.",
        ],
        tips: ["Move a lead along its stages: New → Contacted → Demo → Proposal → Won or Lost, from the drop-down on the lead.", "You see your own leads. Managers see their team's, and founders see everything."],
      },
      {
        title: "Claim an expense", who: "ALL", time: "3 min", img: "14-expenses",
        intro: "Spent your own money on work? Claim it here and attach the receipt.",
        callouts: [
          "**What was it for?** For example `Auto fare to a school visit`.",
          "**Amount (₹).** Whole rupees.",
          "**Category.** Travel, Fuel, Food, Stationery or Other.",
          "**Receipt.** A photo or PDF up to 5 MB. Take the photo while you still have the paper.",
          "**Submit claim.** A founder is notified. You can withdraw a claim until it is decided.",
        ],
        tips: ["The date of spending cannot be in the future.", "A rejected claim always shows the reason. An approved claim shows as **Paid** once the money has been sent."],
      },
    ],
  },
  {
    id: "growth", title: "Scores, rewards and recognition", lead: "How good work is measured, celebrated and rewarded.",
    steps: [
      {
        title: "Scores: the leaderboard", who: "ALL", time: "3 min", img: "16-scores",
        intro: "Points reward finishing work, finishing it on time, and doing harder work. Employees and interns are ranked separately, so it is a fair comparison.",
        callouts: [
          "**Time range.** This week, this month or all time.",
          "**Employees or Interns.** Choose which group to see.",
          "**How points are calculated.** Open this for the exact formula. Hover any score to see how it was worked out.",
        ],
        tips: ["Default points: P1 = 10, P2 = 7, P3 = 5, P4 = 3, multiplied for difficulty (1× easy to 2.2× hardest). On time = full points, up to 24 hours late = 70%, later = 40%. Founders can change these numbers.", "Penalties are small and explained: a missed recurring activity costs 3 points, and a task left overdue for 3+ days without a blocker reason costs 2. Marking a task **Blocked** with a reason avoids the penalty."],
      },
      {
        title: "Challenges, badges, streaks and kudos", who: "ALL", time: "3 min", img: "17-challenges",
        intro: "The fun part. It is there to make good habits visible.",
        callouts: [
          "**Your badges.** Earned for milestones such as your first task, a 10-task club, and streaks. Locked badges show what to aim for next.",
          "**Streak board.** Who has filed stand-ups the most days in a row.",
          "**Give someone kudos.** Pick a colleague and a quick message, such as *Saved the day!*, or write your own.",
          "**Send kudos.** They get a notification, and it appears on the Kudos wall.",
        ],
        tips: ["Founders can also launch **seasonal challenges**, a team goal with a prize, such as a Diwali sprint. The progress bar is at the top of this page.", "On the day, your team's birthdays and work anniversaries are celebrated on My Day."],
      },
      {
        title: "Incentives: what you can earn", who: "ALL", time: "2 min", img: "18-incentives",
        intro: "Incentives are cash rewards for consistent, on-time work. Founders approve every payment.",
        callouts: ["**Your history.** Every award you have received or are waiting on, by month.", "**How to earn them.** The current rules, for example *at least 40 points and 90% on time in a month*."],
        tips: ["Nothing is paid automatically. At the start of each month the founders review who qualified and approve.", "Rules differ for employees and interns. The rules shown here are the ones that apply to you."],
      },
      {
        title: "Referrals: bring someone in", who: "ALL", time: "2 min", img: "19-referrals",
        intro: "Know a school, a franchise partner or a candidate we should talk to? Refer them and earn the reward.",
        callouts: ["**Programme.** Pick what you are referring. The reward is shown next to it.", "**Their name.**", "**Contact.** A phone number or email.", "**Submit referral.** A founder follows up. When it converts, the reward is added to your incentives."],
        tips: ["Add a note: how you know them and the best time to call. It helps us succeed."],
      },
    ],
  },
  {
    id: "settings", title: "Settings and security", lead: "Your account, your privacy and how KalamDesk reaches you.",
    steps: [
      {
        title: "Settings: your account in one page", who: "ALL", time: "4 min", img: "20-settings",
        intro: "Click **Settings** at the bottom of the left menu.",
        callouts: [
          "**Change password.** Enter your current password and a new one (8+ characters).",
          "**Calendar link.** Click **Show my calendar link** and paste the private address into Google, Apple or Outlook calendar. Your deadlines then show up there. Keep the link private.",
          "**Birthday.** Optional. Choose a day and month (never a year) and your team can cheer your day.",
          "**WhatsApp alerts.** Enter your mobile number and tick the box to get alerts on WhatsApp. We never send a message without your tick.",
          "**Download my data.** Everything we hold about you in one file.",
          "**Security.** Turn on two-step sign-in (next page).",
        ],
        tips: ["**Ask for a correction** or **Ask for deletion** sends a request to your founders. This is your right under India's DPDP Act."],
      },
      {
        title: "Two-step sign-in (strongly recommended for founders)", who: "ALL", time: "5 min", img: "48-2fa",
        intro: "Two-step sign-in asks for a 6-digit code from your phone as well as your password. Founders can open bank details, so **founders should turn this on today**.",
        callouts: [
          "**Set up.** From Settings → Security click **Set up two-step sign-in**.",
          "**Scan the QR code.** In Google Authenticator or Microsoft Authenticator, choose *Scan a QR code*.",
          "**Cannot scan?** Type the long key shown here into the app by hand.",
          "**Type the 6-digit code** the app shows now.",
          "**Turn on.** You are then shown 8 recovery codes. Save them somewhere safe (a password manager or paper). Each works once if you lose your phone.",
        ],
        tips: ["Locked out with no phone and no recovery codes? Another founder can switch your two-step sign-in off from your profile.", "Revealing someone's bank details always asks you to confirm your password (and a code) again."],
      },
    ],
  },
  {
    id: "lead", title: "For managers and founders", lead: "Running a team: assign, watch, approve and reward. Employees and interns do not see these screens.",
    steps: [
      {
        title: "The Founder's Desk: your whole team at a glance", who: "LEAD", time: "4 min", img: "30-desk",
        intro: "Open **Desk** every morning. Managers see their own team. Founders see everybody in the organisation.",
        callouts: [
          "**Health tiles.** *Needs attention*, *Keep an eye*, *On track*, and how many stand-ups are in today.",
          "**Self-initiated work to review.** Tasks people started themselves. Open one to accept it (which earns the person a bonus) or leave it.",
          "**A person's card.** Overdue, blocked and open counts, today's top task, and when they last filed a stand-up. Click the name for their full page.",
          "**Nudge.** One friendly reminder to that person, at most once per day. It arrives as a notification, email and WhatsApp if on.",
          "**Dashboard and the rest of the menu.** Leads see extra items: Desk, Recurring, Dashboard, Stand-ups and Templates.",
        ],
        tips: ["Red means someone is overdue or has had no stand-up. Use **Nudge** before you message. It is kinder, and it is recorded."],
      },
      {
        title: "People: your directory", who: "LEAD", time: "2 min", img: "31-people",
        intro: "**People** lists everyone in your organisation, grouped by role.",
        callouts: ["**+ Add person.** Founders only. Starts the onboarding below.", "**Departments.** Founders only. Create and rename teams.", "**A person.** Click the name to see their open tasks and recent activity.", "**edit.** Founders only. Change a role, department, manager, or deactivate the account."],
        tips: ["People who leave are **deactivated**, never deleted. Their history is kept, and they cannot sign in."],
      },
      {
        title: "Add a new employee or intern", who: "FOUNDER", time: "4 min", img: "32-add-person",
        intro: "Founders only. This is the first step of onboarding. KalamDesk emails the person an invitation to choose their own password. You never see or set it.",
        callouts: [
          "**Name.** As they should appear to the team.",
          "**Email.** Their official company email. An email can belong to only one organisation.",
          "**Role.** *Intern* and *Employee* work on their own tasks. *Manager* leads a team. *Founder* sees everything in the organisation, including bank details.",
          "**Department.** Their team. Create more under *Departments*.",
          "**Office.** Hyderabad, Warangal, Remote or Other.",
          "**Reports to.** Their manager. This decides who approves their leave and sees their work.",
          "**Add person and send invite.** They receive the email immediately. Resend it any time from their profile if it is lost.",
        ],
        tips: ["For interns, also set the **start and end dates** further down the form. The team is reminded when an internship is about to end.", "Fill in emergency contact and joining date too. The joining date powers work-anniversary celebrations."],
      },
      {
        title: "A person's page", who: "LEAD", time: "2 min", img: "33-person",
        intro: "Click anyone's name for a quick view of how they are doing.",
        callouts: ["**Edit.** Founders can change details, role or reporting manager.", "**Open tasks.** Everything on their plate, with deadlines and status. You can change a status from here.", "**Nudge.** A friendly reminder on a single task.", "**Recently done.** What they finished lately."],
        tips: ["Founders also see bank details and ID documents (encrypted) on the Edit page. Each reveal asks for a password check and is written to the audit log."],
      },
      {
        title: "Departments", who: "FOUNDER", time: "2 min", img: "34-departments",
        intro: "Departments are the teams in your organisation. Each organisation has its own set.",
        callouts: ["**Name.**", "**Colour.** Shown on tags and charts.", "**Add.**", "**Rename / colour.**", "**Delete.** Only possible when nobody and no task uses it."],
        tips: ["Examples: Accounts, BD, Marketing, Training, Tech. An NGO might use Programs and Outreach."],
      },
      {
        title: "Recurring activities", who: "LEAD", time: "4 min", img: "35-recurring",
        intro: "Anything that repeats: weekly school visits, Monday reports, month-start invoicing. KalamDesk creates each task for you at the right time.",
        callouts: [
          "**Activity.** The task title that will repeat.",
          "**Repeats.** Weekly on chosen days, every weekday, or monthly.",
          "**Days.** Choose which days of the week.",
          "**Assigned to.** Tick everyone responsible. Each person gets their own task and is scored separately.",
          "**Create recurring activity.** Saves the rule. You can pause or edit it later.",
        ],
        tips: ["A task that is not done by the end of its day is marked **Missed**, closed, and a small penalty applies. The person and you are told.", "Managers can only assign recurring work to their own team."],
      },
      {
        title: "Templates: saved task shapes", who: "LEAD", time: "2 min", img: "36-templates",
        intro: "Make a template for work you create again and again, such as a school visit with its checklist.",
        callouts: ["**+ New template.** Give it a name, title, priority and checklist.", "**Edit.**", "**Delete.**"],
        tips: ["When creating a task, choose a template and everything is filled in for you."],
      },
      {
        title: "Dashboard: numbers for the week or month", who: "LEAD", time: "3 min", img: "37-dashboard",
        intro: "See how the team is performing, then share or export it.",
        callouts: ["**Weekly or Monthly.**", "**Export CSV.** For a spreadsheet.", "**Publish snapshot.** Saves a read-only copy with a private link you can share, or download as PDF.", "**Workload per person.** Open tasks for each person. Uneven bars mean uneven work.", "**Top performers.** The current leaders."],
        tips: ["Every chart has **View as table** underneath for screen readers and for copying numbers."],
      },
      {
        title: "Stand-ups: who has filed", who: "LEAD", time: "1 min", img: "38-updates",
        intro: "One page with everyone's daily update, newest first. Obstacles are highlighted so you can help.",
        callouts: [],
        tips: ["Use the arrows to move between days. Missing stand-ups are listed so you can nudge them."],
      },
      {
        title: "Approve expense claims", who: "FOUNDER", time: "2 min", img: "40-expense-approval",
        intro: "Founders approve every expense. Claims waiting for you appear at the top.",
        callouts: ["**All claims.** Open the receipt by clicking it.", "**Approve.** Then, once you have paid, click **Mark paid**.", "**Reject.** You must give a reason. The employee sees it.", "**Download CSV.** Send it to your accountant."],
        tips: ["You cannot approve your own claim unless you are the only founder."],
      },
      {
        title: "Approve leave", who: "LEAD", time: "2 min", img: "41-leave-approval",
        intro: "Open **Leave**. Requests from your team are listed under *Waiting for your decision*.",
        callouts: ["**Waiting for your decision.** Each request shows dates, reason and the cover person.", "**Approve.** You can choose to hand over open tasks to the cover person in one click.", "**Decline.** Add a short note. The person sees it.", "**Today.** Who is away or checked in today."],
        tips: ["Approved leave appears as an *Away until* tag on the Desk."],
      },
      {
        title: "Incentives: rules and monthly awards", who: "FOUNDER", time: "3 min", img: "39-incentives",
        intro: "Set the rules once, then review awards on the 1st of each month. Nothing is paid without your approval.",
        callouts: ["**+ Add rule.** Choose *Threshold* (points and on-time %) or *Top N* (reward the top few), who it applies to and the amount.", "**Edit or pause a rule.**", "**Calculate for this month.** Works out who qualifies. Review each award, approve or reject, then mark it paid.", "**+ Manual award.** Reward something special, with a reason."],
        tips: ["The system emails founders on the 1st with what is waiting for approval."],
      },
      {
        title: "Scoring weights", who: "FOUNDER", time: "2 min", img: "47-scoring-raw",
        intro: "On the **Scores** page, founders see a **Scoring settings** button (also under **Settings → Scoring weights**). There they can tune how points are worked out: points per priority, difficulty multipliers, late penalties, the initiative bonus, and the missed-recurring and overdue penalties.",
        callouts: [],
        tips: ["Each box shows its default. **Reset to defaults** puts everything back. Changes apply to future scoring; they do not rewrite history."],
      },
    ],
  },
  {
    id: "owner", title: "For group owners: several organisations", lead: "Running Robokalam, Samaritan Stand-Up, Calvings, Nextpreneur and more from one place, with each one completely separate.",
    steps: [
      {
        title: "Switch between organisations", who: "OWNER", time: "1 min", img: "43-switcher",
        intro: "Group owners see an organisation switcher at the top of the left menu. Everyone else sees only their own organisation's name.",
        callouts: ["**The switcher.** Shows where you are. Click it.", "**An organisation.** Click to move there. The whole screen changes to that organisation's people, tasks and colour.", "**Manage organisations.** Opens the control page."],
        tips: ["What is in one organisation is never visible in another. Staff of Samaritan cannot see Robokalam staff, and the reverse. Only group owners, who are founders of every organisation, cross over.", "Each time you sign in you start back in your home organisation."],
      },
      {
        title: "Organisations: create, colour and manage", who: "OWNER", time: "3 min", img: "42-organisations",
        intro: "Open **Organisations** in the menu. Each organisation has its own card, with its own dashboard.",
        callouts: ["**Your organisation** is marked *Viewing now*. *Home* is the one you belong to.", "**Open dashboard / Open.** Jump into that organisation's Desk.", "**Edit.** Rename it, change its one-line description, or pick its brand colour. The app repaints in that colour whenever you are inside it.", "**New organisation.** Start another one.", "**Group owners.** Choose which other founders may open every organisation."],
        tips: ["**Archive** hides an organisation and signs its people out. Nothing is deleted and you can restore it.", "People and open-task counts are shown for each organisation, and you can compare at a glance."],
      },
      {
        title: "Start a new organisation", who: "OWNER", time: "3 min", img: "44-new-org",
        intro: "Adding Calvings, Nextpreneur or anyone else takes about a minute.",
        callouts: ["**Name.** For example *Calvings*.", "**Colour.** Pick the brand colour. All options keep text readable.", "**First founder.** Optional but recommended. Enter their name and email, and they receive an invitation. They will only ever see this organisation.", "**Create.** Then open the organisation, add its departments and people just as you did for the first one."],
        tips: ["An email address can belong to only one organisation. If someone works for two, give them a separate email for each, or make them a group owner."],
      },
    ],
  },
];

const roleLabel = { ALL: "Everyone", LEAD: "Managers & founders", FOUNDER: "Founders", OWNER: "Group owners" };

// ---------- Onboarding plan ----------
const onboarding = {
  employee: [
    ["Day 1", ["Accept the invitation and choose a password", "Read and accept the privacy notice", "Tap **I'm in** on My Day", "Open every item in the left menu once, to see what is there", "Add your birthday and WhatsApp number in Settings (optional)", "File your first stand-up before you leave", "Add one task of your own with **+ New task**"]],
    ["Week 1", ["File a stand-up every working day (aim for a 5-day streak)", "Finish at least 3 tasks on time and mark them Done", "Add a checklist and a comment to one task", "Attach one file to a task", "Send one kudos to a teammate", "Read how points are calculated on **Scores**", "Download your calendar link into your phone calendar"]],
    ["Month 1", ["Log your leads, visits or expenses in KalamDesk instead of on paper", "Ask for leave using the Leave page, naming a cover person", "Check your level, badges and rank. Pick one thing to improve", "Turn on two-step sign-in (founders: required)", "Give your manager one suggestion to improve KalamDesk"]],
  ],
  intern: [
    ["Day 1", ["Accept the invitation and choose a password", "Read and accept the privacy notice", "Tap **I'm in** on My Day", "Meet your manager and find them under **People**", "Add one task of your own so you have something to work on", "File your first stand-up before you leave"]],
    ["Week 1", ["File a stand-up every working day", "Finish your first task and look at the points it earned", "Ask your manager for feedback via a task comment", "Open **Scores → Interns** to see how interns are ranked", "Send kudos to someone who helped you"]],
    ["Final month", ["Check your internship end date with your manager", "Upload any pending expense claims with receipts", "Ask for a reference or feedback note while your work history is fresh", "Download your data from **Settings** if you want a record of your work"]],
  ],
  founder: [
    ["Before they start", ["Go to **People → + Add person** and fill in name, official email, role, department, office and manager", "For interns, set the start and end dates", "Click **Add person and send invite**", "Add their tasks for week 1 (or use the checklist below) so My Day is not empty", "Tell them to look for the *Welcome to KalamDesk* email and check spam"]],
    ["Day 1", ["Check they appear on the Desk and have tapped **I'm in**", "Assign a first small task with a clear deadline", "Show them the stand-up page", "For founders and managers: ask them to turn on two-step sign-in"]],
    ["End of week 1", ["Read their stand-ups and the tasks they finished", "Send kudos for something genuine", "Approve any self-initiated work they added", "Ask what was confusing, and fix it for the next person"]],
  ],
};

const taskStarters = [
  ["Complete KalamDesk onboarding", "Set your password, accept the privacy notice, tap I'm in, add your birthday (optional).", "P2", "Day 1"],
  ["File your first stand-up", "Open Daily update and tell the team what you did today.", "P2", "Day 1"],
  ["Tour of KalamDesk", "Open every menu item once. Make a note of anything unclear and send it to your manager.", "P3", "Day 2"],
  ["Finish three tasks on time", "Use My Day to plan them, mark them Done on time.", "P2", "Week 1"],
  ["Use checklists and comments", "Add a checklist and one comment with an @mention on a real task.", "P3", "Week 1"],
  ["Log your first lead / visit / expense", "Whichever applies to your role. Use KalamDesk, not paper.", "P3", "Week 2"],
  ["Ask for a day of leave (practice)", "Open Leave and see how a request looks, then cancel it if you do not need it.", "P4", "Week 2"],
  ["Share one improvement idea", "Tell your manager one thing KalamDesk should do better.", "P4", "Month 1"],
];

const faq = [
  ["I forgot my password.", "On the sign-in page click **Forgot password?**, enter your email and use the link we send. It works once and lasts 1 hour."],
  ["I never got the invitation email.", "Check your spam folder first. Then ask a founder to open your profile and send a new invitation."],
  ["I cannot see a menu item a colleague has.", "Menus depend on your role. Leads see Desk, Recurring, Dashboard, Stand-ups and Templates. Only founders see Departments, bank details and approvals, and only group owners see Organisations."],
  ["Why can't I see colleagues from the other organisation?", "Each organisation is completely separate by design. Nobody in one can see the people, tasks or data of another."],
  ["My task is late because I am waiting for someone.", "Set the status to **Blocked** and write the reason. The person who assigned it is told, and you avoid the overdue penalty."],
  ["I finished a task but it will not close.", "It may need proof. Add the note or file it asks for. Or it may be waiting in **In Review** for a manager to approve."],
  ["I changed my mind about a leave request or expense.", "Cancel leave on the Leave page, and withdraw an expense claim on the Expenses page, until it has been decided."],
  ["Are my bank details safe?", "They are encrypted, and only founders can open them. Every reveal asks for a password check and is logged."],
  ["Can I use KalamDesk on my phone?", "Yes. Open the same address in your phone's browser. The menu becomes a bar along the bottom, and you can add the page to your home screen."],
  ["What does a red dot on the bell mean?", "A new notification: a task assigned to you, a comment, a reminder or kudos."],
  ["I turned on two-step sign-in and lost my phone.", "Use one of your recovery codes instead of the 6-digit code. If you have none, another founder can switch it off for you."],
];

// ---------- HTML ----------
let n = 0;
const stepHtml = (s) => {
  n += 1;
  const num = String(n).padStart(2, "0");
  return `
<section class="step" id="s${n}">
  <header><span class="num">${num}</span><div><h3>${md(s.title)}</h3><p class="meta"><span class="who who-${s.who}">${roleLabel[s.who]}</span><span>About ${s.time}</span></p></div></header>
  <p class="intro">${md(s.intro)}</p>
  <figure><img src="img/${s.img}.png" alt="${esc(s.title)}"></figure>
  ${s.callouts.length ? `<ol class="callouts">${s.callouts.map((c) => `<li>${md(c)}</li>`).join("")}</ol>` : ""}
  ${s.tips.length ? `<aside class="tips"><b>Good to know</b><ul>${s.tips.map((t) => `<li>${md(t)}</li>`).join("")}</ul></aside>` : ""}
</section>`;
};

const toc = parts.map((p, i) => `<li><a href="#p-${p.id}"><b>Part ${i + 1}</b> ${esc(p.title)}</a></li>`).join("") +
  `<li><a href="#onboarding"><b>Part ${parts.length + 1}</b> Onboarding plan and starter tasks</a></li><li><a href="#faq"><b>Part ${parts.length + 2}</b> Questions and quick reference</a></li>`;

const partsHtml = parts.map((p, i) => `
<section class="part" id="p-${p.id}">
  <div class="part-title"><span>Part ${i + 1}</span><h2>${esc(p.title)}</h2><p>${md(p.lead)}</p></div>
  ${p.steps.map(stepHtml).join("")}
</section>`).join("");

const checklist = (arr) => arr.map(([h, items]) => `<div class="phase"><h4>${h}</h4><ul>${items.map((t) => `<li><span class="box"></span>${md(t)}</li>`).join("")}</ul></div>`).join("");

const onboardingHtml = `
<section class="part" id="onboarding">
  <div class="part-title"><span>Part ${parts.length + 1}</span><h2>Onboarding plan and starter tasks</h2><p>Hand these out. Tick the boxes on paper, or create the starter tasks in KalamDesk so they appear on each person's My Day.</p></div>
  <section class="step plan"><header><span class="num">A</span><div><h3>New employee: first month</h3></div></header><div class="phases">${checklist(onboarding.employee)}</div></section>
  <section class="step plan"><header><span class="num">B</span><div><h3>New intern: the internship</h3></div></header><div class="phases">${checklist(onboarding.intern)}</div></section>
  <section class="step plan"><header><span class="num">C</span><div><h3>For the founder or manager: onboarding someone</h3></div></header><div class="phases">${checklist(onboarding.founder)}</div></section>
  <section class="step plan"><header><span class="num">D</span><div><h3>Starter tasks to assign</h3><p class="meta"><span>Copy these into KalamDesk (use <b>+ New task</b> or a template) and assign them to every new joiner.</span></p></div></header>
    <table class="tasks"><thead><tr><th>Task title</th><th>Description</th><th>Priority</th><th>Due</th></tr></thead><tbody>
    ${taskStarters.map(([t, d, p, due]) => `<tr><td><b>${esc(t)}</b></td><td>${esc(d)}</td><td>${p}</td><td>${due}</td></tr>`).join("")}
    </tbody></table>
    <aside class="tips"><b>Tip</b><ul><li>Save these as **templates** (Templates menu), then each new person takes one click to set up.</li></ul></aside>
  </section>
</section>`;

const faqHtml = `
<section class="part" id="faq">
  <div class="part-title"><span>Part ${parts.length + 2}</span><h2>Questions and quick reference</h2><p>Quick answers, and the things worth remembering.</p></div>
  <section class="step"><header><span class="num">?</span><div><h3>Common questions</h3></div></header>
    <dl class="faq">${faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${md(a)}</dd>`).join("")}</dl></section>
  <section class="step"><header><span class="num">✓</span><div><h3>Quick reference</h3></div></header>
    <div class="grid2">
      <div><h4>Priorities</h4><table class="ref"><tr><td><b>P1</b></td><td>Urgent. Do it now.</td></tr><tr><td><b>P2</b></td><td>High. Today.</td></tr><tr><td><b>P3</b></td><td>Normal. The default.</td></tr><tr><td><b>P4</b></td><td>When you are free.</td></tr></table></div>
      <div><h4>Task statuses</h4><table class="ref"><tr><td><b>To Do</b></td><td>Not started.</td></tr><tr><td><b>In Progress</b></td><td>You are on it.</td></tr><tr><td><b>Blocked</b></td><td>Stuck. A reason is required.</td></tr><tr><td><b>In Review</b></td><td>Waiting for approval.</td></tr><tr><td><b>Done</b></td><td>Finished.</td></tr></table></div>
      <div><h4>Who can do what</h4><table class="ref"><tr><td><b>Intern / Employee</b></td><td>Own tasks, stand-ups, leave, leads, expenses, scores, kudos.</td></tr><tr><td><b>Manager</b></td><td>Everything above, plus assign work to the team, review, approve leave, Desk, Dashboard.</td></tr><tr><td><b>Founder</b></td><td>Everything in the organisation, including people, departments, bank details, expenses and incentives.</td></tr><tr><td><b>Group owner</b></td><td>A founder who can switch between organisations.</td></tr></table></div>
      <div><h4>Handy shortcuts</h4><table class="ref"><tr><td><kbd>N</kbd></td><td>Add a task from anywhere.</td></tr><tr><td><kbd>Enter</kbd></td><td>Save in the quick-add box.</td></tr><tr><td><kbd>Esc</kbd></td><td>Close a pop-up or menu.</td></tr></table>
      <h4 style="margin-top:14px">WhatsApp replies (if turned on)</h4><table class="ref"><tr><td><b>DONE a1b2c3</b></td><td>Finish a task. The code is in each alert.</td></tr><tr><td><b>START a1b2c3</b></td><td>Mark it in progress.</td></tr><tr><td><b>BLOCKED a1b2c3 reason</b></td><td>Mark it blocked.</td></tr><tr><td><b>UPDATE …</b></td><td>File your stand-up.</td></tr><tr><td><b>TASKS</b></td><td>See what is due.</td></tr></table></div>
    </div></section>
</section>`;

const css = `
:root{--ink:#0f172a;--mute:#5b6478;--line:#e3e7ee;--brand:#4f46e5;--deep:#1e1b4b;--red:#e11d48}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:15px/1.6 "Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;color:var(--ink);background:#f4f5f8}
.wrap{max-width:980px;margin:0 auto;padding:0 28px}
.cover{min-height:100vh;color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:64px 56px;background:radial-gradient(circle at 85% 10%,rgba(255,255,255,.16),transparent 40%),linear-gradient(145deg,#4f46e5,#1e1b4b 70%)}
.cover .logo{width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px}
.cover h1{font-size:60px;line-height:1.04;margin:0 0 16px;letter-spacing:-.02em}.cover p.sub{font-size:21px;max-width:620px;opacity:.9;margin:0}
.cover .foot{display:flex;justify-content:space-between;opacity:.8;font-size:14px}
.page{padding:56px 0}.page h2{font-size:30px;margin:0 0 6px;letter-spacing:-.01em}.page .lead{color:var(--mute);margin:0 0 24px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px 28px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 10px 30px -16px rgba(15,23,42,.18)}
.how{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.mark{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--red);color:#fff;font-weight:700;font-size:14px;box-shadow:0 0 0 3px #fff,0 0 0 4px #e3e7ee}
.hl{display:inline-block;border:3px solid var(--red);border-radius:8px;background:rgba(250,204,21,.18);padding:2px 12px;font-weight:600}
.toc{columns:2;gap:36px;list-style:none;padding:0;margin:0}.toc li{break-inside:avoid;margin:0 0 10px}.toc a{color:var(--ink);text-decoration:none;display:block;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:#fff}.toc b{color:var(--brand);margin-right:8px}
.who-legend span{display:inline-block;margin:4px 8px 4px 0}
.part{padding:20px 0}.part-title{margin:52px 0 22px;padding:34px 34px;border-radius:22px;color:#fff;background:linear-gradient(135deg,#4f46e5,#1e1b4b);page-break-before:always;break-before:page}
.part-title span{font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.8;font-weight:700}.part-title h2{margin:6px 0 8px;font-size:34px;letter-spacing:-.02em}.part-title p{margin:0;opacity:.9;max-width:680px}
.step{background:#fff;border:1px solid var(--line);border-radius:20px;padding:26px 30px 24px;margin:0 0 26px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 12px 34px -18px rgba(15,23,42,.22);break-inside:avoid-page}
.step header{display:flex;gap:16px;align-items:center;margin-bottom:12px}.num{flex:none;width:46px;height:46px;border-radius:14px;background:linear-gradient(160deg,#4f46e5,#1e1b4b);color:#fff;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center}
.step h3{margin:0;font-size:22px;letter-spacing:-.01em;line-height:1.25}.meta{margin:4px 0 0;color:var(--mute);font-size:13px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.who{padding:2px 10px;border-radius:999px;font-weight:700;font-size:12px;background:#eef2ff;color:#3730a3}.who-LEAD{background:#fef3c7;color:#92400e}.who-FOUNDER{background:#fee2e2;color:#991b1b}.who-OWNER{background:#dcfce7;color:#166534}
.intro{margin:6px 0 14px;font-size:16px}
figure{margin:0 0 16px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#f4f5f8}figure img{display:block;width:100%;height:auto}
ol.callouts{list-style:none;counter-reset:c;margin:0;padding:0;display:grid;gap:10px}
ol.callouts li{counter-increment:c;position:relative;padding:10px 14px 10px 54px;border:1px solid var(--line);border-radius:12px;background:#fbfbfd}
ol.callouts li::before{content:counter(c);position:absolute;left:12px;top:9px;width:28px;height:28px;border-radius:50%;background:var(--red);color:#fff;font-weight:700;text-align:center;line-height:28px;box-shadow:0 0 0 3px #fff,0 0 0 4px #e3e7ee}
.tips{margin-top:16px;padding:14px 18px;border-radius:12px;background:#eef2ff;border:1px solid #dfe4ff}.tips b{display:block;margin-bottom:4px;color:#3730a3}.tips ul{margin:0;padding-left:18px}.tips li{margin:3px 0}
kbd{font:600 .85em ui-monospace,Consolas,monospace;background:#eef0f5;border:1px solid #d9dde6;border-bottom-width:2px;border-radius:6px;padding:1px 6px}
.phases{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.phase{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:#fbfbfd}.phase h4{margin:0 0 8px;color:var(--brand);font-size:16px}.phase ul{list-style:none;margin:0;padding:0}.phase li{display:flex;gap:10px;margin:7px 0;font-size:14px;line-height:1.45}.box{flex:none;width:16px;height:16px;border:2px solid #9aa3b5;border-radius:4px;margin-top:3px}
table.tasks{width:100%;border-collapse:collapse;font-size:14px;margin-top:10px}.tasks th,.tasks td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.tasks th{background:#f4f5f8;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute)}
.faq dt{font-weight:700;margin-top:14px}.faq dd{margin:4px 0 0;color:#2b3348}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px}.grid2 h4{margin:0 0 6px}table.ref{width:100%;border-collapse:collapse;font-size:14px}.ref td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}.ref td:first-child{white-space:nowrap}
.end{text-align:center;color:var(--mute);padding:40px 0 70px}
@page{size:A4;margin:12mm}
@media print{body{background:#fff}.wrap{max-width:none;padding:0}.cover{min-height:270mm;border-radius:0}.page{padding:6mm 0}.step{box-shadow:none;margin-bottom:6mm;padding:5mm 6mm}.card{box-shadow:none}.part-title{margin-top:0}.toc a{border-color:#ccd}}
@media(max-width:760px){.how,.grid2,.phases{grid-template-columns:1fr}.toc{columns:1}.cover h1{font-size:40px}}
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KalamDesk User Guide</title><style>${css}</style></head><body>
<section class="cover"><div class="logo">K</div>
<div><h1>KalamDesk<br>User Guide</h1><p class="sub">Step by step, screen by screen. For every employee, intern, manager, founder and group owner.</p></div>
<div class="foot"><span>Onboarding edition</span><span>Screenshots use demo data</span></div></section>

<div class="wrap">
<section class="page"><h2>How to use this guide</h2><p class="lead">Every screen has a screenshot. The red numbers on the screenshot match the numbered list under it.</p>
<div class="how">
<div class="card"><p><b>Look for the yellow highlight</b> with a red border. That is the thing to look at or click.</p><p><span class="hl">Sign in</span> &nbsp; <span class="mark">3</span></p><p>The number in the red circle tells you the order, and where to read about it below the picture.</p></div>
<div class="card"><p><b>Who is each step for?</b> Every step carries a tag.</p><p class="who-legend"><span class="who">Everyone</span><span class="who who-LEAD">Managers &amp; founders</span><span class="who who-FOUNDER">Founders</span><span class="who who-OWNER">Group owners</span></p><p>If you are an employee or intern, you only need <b>Parts 1 to 5</b>. Part ${parts.length + 1} is your onboarding checklist.</p></div>
</div></section>
<section class="page"><h2>Contents</h2><ul class="toc">${toc}</ul></section>
${partsHtml}
${onboardingHtml}
${faqHtml}
<p class="end">KalamDesk · If something here does not match what you see, tell your founder so the guide can be fixed.</p>
</div></body></html>`;

fs.writeFileSync(path.join(here, "KalamDesk-User-Guide.html"), html);
console.log("steps:", n, "html bytes:", html.length);
