# Revenue experiments

**Primary KPI:** new paying customers per week. **Secondary:** revenue.
**Scoreboard:** `/admin?key=...` → "Paying customers by channel". It shows free checks, signups, checkouts opened, paid orders and revenue for each channel, ranked by revenue. The channel is the first link or site that brought each visitor (`?utm_source=` / `utm_campaign=`, or the referring site).

**First milestone:** 10 paying customers.

## Log

| Experiment | Started | Cost | Free checks | Signups | Paid | Revenue | CAC | Result |
|---|---|---:|---:|---:|---:|---:|---:|---|
| E1 Existing signups, founder email | | $0 | | | | | | |
| E2 High-pain Reddit replies | | $0 | | | | | | |
| E3 Career-coach partner pilot | | commission | | | | | | |

Fill it in from the admin table every Monday. After 14 days, kill any channel with 0 checkouts and put its time into the best one.

---

## E1: Existing signups, personal founder email

- **Hypothesis:** people who already signed up and tried Work-ly are the most likely first buyers. A personal note plus the founding price converts 5–10% of them.
- **Execution:** send the founder email (drafted in chat) in batches of 30–50. Every link carries tracking:
  - Free check: `https://www.work-ly.in/free-grader?utm_source=email&utm_medium=founder&utm_campaign=signups-oct`
  - Pricing: `https://www.work-ly.in/pricing?utm_source=email&utm_medium=founder&utm_campaign=signups-oct`

  Note: signups already have a first-touch source, so their purchases stay credited to how they first arrived. Count E1 by reply and purchase dates.
- **Success:** 2+ paid within 14 days.
- **Needs:** the Polar founding discount switched on first, or the offer line removed.

## E2: High-pain Reddit replies (value first)

- **Hypothesis:** people posting "200 applications, no interviews" have urgent pain. A genuinely useful reply with the free check converts better than posts about Work-ly.
- **Where:** r/jobsearchhacks, r/jobhunting, r/jobsearch, r/GetEmployed, and the r/datascience weekly entering/transitioning thread. Check each sidebar first.
- **Routine:** 5–10 replies a day, only on posts with a clear "why no interviews / should I apply" problem. Always disclose that you built the tool.
- **Tracked link (change the campaign per subreddit):**
  `https://www.work-ly.in/why-am-i-not-getting-interviews?utm_source=reddit&utm_medium=comment&utm_campaign=r-jobsearchhacks`
- **Reply template** (edit for each post; never paste it verbatim everywhere):

  > From what you've described, the usual culprit is {must-haves not visible / duties instead of proof / level mismatch}. {One concrete fix for their situation, 2–3 sentences.}
  >
  > If you want to check a specific posting, I built a free checker that goes requirement by requirement and quotes where your resume shows each one (disclosure: it's my project, no signup for the first check): {link}. Happy to look at one here too if you paste the job's must-haves.

- **Success:** 1+ paid, or a checkout rate of 3%+ of free checks, within 14 days.
- **Stop if:** a subreddit removes the replies or bans links. Then answer without links there.

## E3: Career-coach and creator partner pilot

- **Hypothesis:** small career coaches and data-career creators already advise high-intent job seekers. A revenue share turns them into a sales channel that costs nothing until someone pays.
- **Offer:** 30% of each referred customer's first payment. Pay out monthly, by hand, from the admin report. Each partner gets their own Polar discount code (e.g. `COACHANNA10`, 10% off for their audience) and their own link:
  `https://www.work-ly.in/?utm_source=partner&utm_medium=affiliate&utm_campaign=<partner-name>`
- **Who:** 10 coaches or creators found through their public business pages (LinkedIn, their websites). Use only contact details they publish for business enquiries.
- **Outreach template:**

  > Hi {name}, I run Work-ly (work-ly.in), which checks a resume against a specific job requirement by requirement and quotes the evidence, so people see exactly what gets them screened out. Your clients/audience seem to be exactly who it's for.
  >
  > Would you like to try it free, and if it's useful, share it? I'd give your audience {10}% off with your own code and pay you 30% of every first purchase. No commitment: if it's not useful for your people, just say so.
  >
  > Advitya, founder

- **Success:** 3 partners active and 1+ paid within 30 days.

## Also do (low effort, free)

- List on AlternativeTo as an alternative to Jobscan, Teal and Rezi, with `?utm_source=alternativeto` in the link.
- Keep the three problem pages live for search: `/why-am-i-not-getting-interviews`, `/should-i-apply`, `/resume-job-match`.

## Weekly report (every Monday)

- **New paying customers (7d)** and **revenue (7d):** top-right of the admin table.
- **Channels ranked by revenue:** the admin table.
- **Best / worst experiment and why**, and **next experiment:** one line each.
