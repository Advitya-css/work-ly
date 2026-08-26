# Workly — Security & Readiness Audit

**Scope:** Full codebase, checked against the current live version on your device (commit `78d9533`, which includes the new Gig & Musician Mode, Pathway AI upgrade, and part-time features).
**Verdict:** Not yet safe to open up to 10,000 users. There is one issue you should fix **today regardless of user count** (a database-altering endpoint anyone on the internet can hit), plus three more that will cause real outages once you have more than a few dozen people using the app at once. Nothing found puts one user's CV or profile in front of another user — that isolation is solid. Below is everything, worst first.

---

## Fix today (not scale-dependent — this is live risk right now)

**1. `/api/fix-db` lets anyone rewrite your database schema — no login required.**
File: `src/app/api/fix-db/route.ts`
This page runs `ALTER TABLE users ADD COLUMN ...` against your real, live database, and it has **zero check for who's asking** — anyone who visits that URL, even just by clicking a link, triggers it. It's not destructive today (it only adds columns if they're missing), but it's an open door: it also prints the raw database error back to whoever visits it if something goes wrong, and repeated hits can lock the `users` table under load. This looks like a one-time fix script from earlier development that was never removed.
**Fix:** delete this file, or if you still need it, put it behind the same admin/secret check your cron job uses.

**2. The weekly job-alert cron can be triggered by anyone if `CRON_SECRET` isn't set.**
File: `src/app/api/cron/job-alerts/route.ts`, line 15
The check that's supposed to require a secret has a bug: if you never set the `CRON_SECRET` environment variable, the code ends up comparing against the literal text `"Bearer undefined"` — so anyone who sends exactly that text as their request header passes the check. Please confirm `CRON_SECRET` is actually set in your Vercel project's environment variables. If it is, you're fine today, but the code should be changed to refuse access outright when the secret is missing, rather than silently falling back to something guessable.

---

## Will break as you scale (these are the "not ready for 10,000 users" items)

**3. The database connection setup isn't guaranteed to use a pooled connection, and allows too many connections per server.**
File: `src/lib/db/pool.ts`
Vercel runs your app as many separate, short-lived server instances under load, and each one opens up to 10 direct database connections. Standard Postgres plans allow somewhere between 100–300 total connections. Do the math: with only 20-30 of Vercel's server instances warm at once — which happens with fairly ordinary traffic, nowhere near 10,000 concurrent users — you can exceed your database's connection limit and the whole app goes down for everyone, not just the person who triggered it.
**What to check:** your `DATABASE_URL` (or `SUPABASE_POOLER_URL`) in Vercel needs to point at your database provider's *pooled* connection string, not the direct one — most providers (Supabase, Neon, etc.) give you both, and it's an easy mix-up. I'd also recommend lowering `max: 10` to something like `max: 3` regardless, as a safety margin.

**4. The weekly "new job alert" email cron will silently stop reaching most users as you grow.**
File: `src/app/api/cron/job-alerts/route.ts`
This job processes every user with an active job search one at a time, in a single run, capped at 5 minutes by Vercel. Each user takes a few seconds (it searches job boards and re-scores matches for them). Do the math again: 5 minutes only covers roughly 60–100 users before Vercel force-kills the job — everyone after that in the list simply never gets processed that week, with no error or alert to tell you it happened. At 10,000 users, even a modest fraction of active job-seekers would mean most of your users stop getting alerts and you'd have no visibility into it.
**Fix (needs redesign, not a one-line patch):** this needs to become "one small job per user" (or per small batch) instead of one giant loop — happy to help design this when you're ready.

**5. "Gig & Musician Mode" has no effect on job discovery — the feature doesn't actually work yet.**
File: `src/lib/discovery/run.ts`, line 167 vs. `src/lib/discovery/sources/api-provider.ts`
The part-time toggle is correctly wired through to job search, but the freelance/gig-mode toggle is not — it's read from the user's settings but never actually passed into the code that searches for jobs. Anyone who turns on Gig & Musician Mode gets identical search results to someone who didn't. This is a one-line fix (pass the missing flag through), not a design problem.

**6. `career_goals`, a table read on nearly every page load, has no index on the column it's always searched by.**
File: `prisma/schema.prisma`
Every other user-owned table in your schema has an index on `userId` except this one, which is looked up on the dashboard, discovery page, career-path page, and by the weekly cron. Without an index, the database has to scan the whole table every time — cheap now with a handful of users, measurably slower as the table grows into the thousands of rows. Cheap, safe, additive fix (`ADD COLUMN`-style, not destructive).

---

## Should fix before wider launch (real, but lower urgency)

**7. Signing in with Google has no protection against a known login-hijack trick (missing OAuth "state" parameter).**
Files: `src/app/api/auth/google/route.ts`, `.../callback/route.ts`
This is a well-known category of bug: without a random one-time "state" value that gets checked on the way back from Google, an attacker can trick someone into logging into *the attacker's* Google-linked Workly account without realizing it, and then unknowingly save their real CV/career data into it. Standard, well-documented fix (generate a random token before redirecting to Google, store it in a cookie, verify it matches on the way back).

**8. There's no way to force-logout a compromised account.**
File: `src/lib/auth/session.ts`
Sessions are self-contained tokens with no record kept in the database, so resetting a password or clicking "sign out" only affects the current device — a stolen "remember me" session (which can last 30 days) stays valid everywhere else until it naturally expires. This is a bigger architectural change, not urgent today, but worth knowing about before you're handling real users' account-takeover reports.

**9. Two AI-powered features (Interview Prep, Application Strategy) have no usage limits and can leak raw error text.**
Files: `src/app/api/applications/[id]/interview-prep/route.ts`, `.../strategy/route.ts`
Every other AI feature in the app is rate-limited to control cost; these two were missed, so a script (or one impatient user) could rack up unlimited paid AI API calls. They also send the raw internal error message back to the browser if something fails, which the rest of the app deliberately avoids doing (in case that message ever contains something you don't want exposed).

**10. Sort dropdowns on two pages don't actually sort anything.**
Files: `src/components/applications/applications-board.tsx`, `src/components/discovery/discovery-board.tsx`
On the Applications board, the "sort" control is missing entirely from the screen even though the code has a slot for it. On the Discovery board, the dropdown is there and looks like it works, but changing it doesn't change the order of results. Cosmetic/functional bug, not a security issue.

**11. Pathway "next steps" cards can show raw formatting symbols (like `**bold**`) instead of styled text.**
File: `src/components/pathway/action-card.tsx`
The AI is told to write these descriptions using Markdown formatting, but this particular card just prints the text as-is instead of rendering it — so users occasionally see literal asterisks. The similar "step" cards elsewhere do this correctly; this one component was missed.

**12. Turning on Part-Time or Freelance mode can silently fail to save for brand-new users.**
Files: `src/lib/settings/part-time-actions.ts`, `src/lib/settings/freelance-actions.ts`
These two settings assume a career profile row already exists for the user before updating it. If someone toggles the setting before their profile has been created any other way, the save reports success but nothing actually changes.

**13. Login responses take measurably longer for real, registered emails than fake ones.**
File: `src/lib/auth/providers/local.ts`
The error message is identical either way ("Invalid email or password"), but a real email address triggers a slower password check behind the scenes, so timing alone can reveal which emails have Workly accounts. Minor, but easy to fix with one dummy check on the "email not found" path.

**14. Login/signup/reset rate limits share one shared counter per IP address instead of separate ones.**
File: `src/lib/auth/actions.ts`
All six account-related actions (sign up, log in, forgot password, reset password, resend code, verify code) currently count against the exact same bucket per visitor, even though they're meant to have different limits. This doesn't remove protection, but it makes it behave inconsistently — e.g., someone on a shared office/campus network could get counted together in ways you didn't intend.

**15. Signing in with Google auto-links to an existing email/password account without double-checking Google's "verified email" flag.**
File: `src/lib/auth/providers/local.ts`
Very low real-world likelihood, but worth knowing: Workly trusts whatever email Google reports and merges it straight into a matching existing account.

---

## Minor / cleanup items (no urgency)

- Password-reset tokens are stored in the database as plain text, while verification codes are correctly stored hashed. Low risk (someone would need database access anyway), but worth making consistent.
- If the Resend email API key is ever accidentally left blank in production, the app falls back to printing verification codes and reset links to the server logs in plain text instead of failing with a clear error.
- Password hashing strength (bcrypt, cost 10) is solid for today; consider bumping it to 12 as a routine hardening step once you're handling real payment-adjacent data at scale.
- The "This is a part-time role" checkbox on manually-added applications just appends text to the job title rather than storing a real yes/no flag, which slightly breaks your own analytics (same job shows up as two different "roles").
- A couple of small formatting/dead-code items (an inline-code style bug in the shared Markdown renderer; some unused search/SSRF code left over from earlier work) — no user impact, just tidiness.

---

## What's already solid (verified, no action needed)

- **No SQL injection anywhere** — every database query in the app is properly parameterized; none of ~110 query call sites build SQL by pasting in user text.
- **No exploitable XSS**, including in the newly-added "render AI output as formatted Markdown" feature — it doesn't allow embedded HTML/scripts to run, by design of the library it uses.
- **Cross-user data isolation is correctly enforced** everywhere it matters — CVs, career profiles, job opportunities, applications, and dream jobs all check that the logged-in user actually owns the record before returning or changing it, including in the newer gig/freelance/part-time features.
- **Email verification codes** are randomly generated, stored hashed (not plain text), expire in 10 minutes, are single-use, and are capped at 5 wrong guesses — solid, no changes needed.
- **Session cookies** are set correctly (httpOnly, secure, sameSite).
- **Security headers** (Content-Security-Policy, HSTS, X-Frame-Options, etc.) from the earlier security pass are intact and haven't regressed.
- **API keys and secrets** are only ever read on the server, never exposed to the browser.
- **Recent database migrations** (for part-time mode, freelance mode) are safe, additive, and won't lock or break your live table.
- File uploads (CVs) are validated properly and can't be used for path traversal or to access another user's files.

---

## Suggested order of operations

1. Delete or lock down `/api/fix-db` (#1) — a few minutes, do this first regardless of anything else.
2. Confirm `CRON_SECRET` is actually set in Vercel (#2) — a few minutes.
3. Confirm your `DATABASE_URL` points at a pooled connection, and lower `max` in `pool.ts` (#3) — a few minutes to check, could be as simple as swapping an environment variable.
4. Add the missing index on `career_goals` (#6) — a few minutes, safe on a live database.
5. Fix the Gig & Musician Mode discovery bug (#5) — a few minutes, one line.
6. When you're ready, I can help redesign the weekly alert cron to process users in batches instead of one long loop (#4) — this is the one real piece of engineering work in the list.
7. The rest (#7–15 and cleanup) are worth doing but none are urgent — happy to work through them whenever you want.

I haven't changed any code yet — this is the audit only. Let me know which of these you'd like me to start fixing and I'll work through them.
