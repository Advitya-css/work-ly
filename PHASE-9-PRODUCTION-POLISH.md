# Phase 9 — Production Polish

No new features. This phase made what already exists trustworthy: it found and
fixed real bugs, closed security and privacy gaps, and put a test suite around
the parts that were silently wrong.

---

## How to install this into your folder

Everything in `workly-phase9-polish.tar.gz` uses paths relative to your project
root, so it unpacks straight over the top of what you have.

```bash
cd ~/Downloads/workly
tar -xzf ~/Downloads/workly-phase9-polish.tar.gz
npm install
npm run check:env
npm test
npm run dev
```

`npm install` is needed because this phase added the test runner.

---

## The bugs this phase found

These were all live in the code you were running.

**1. Every fit score was badly, systematically too low.**

The job-description reader threw away any requirement bullet that ended in a
full stop — which is how most job posts write them. So "Strong Python for
analysis (pandas, statistical testing)." was discarded, `requiredSkills` came
back empty, and the 30-point skills part of the score always scored zero with
the explanation *"the posting didn't list specific required skills."*

**2. The CV reader produced one fake job per line.**

Uploading a two-job CV created ten entries titled "Role not confidently
identified", with bullet points as company names. It also never read the dates,
so years of experience stayed empty and the 25-point experience part of every
score reported *"You have 0 years of experience."*

Together, these two made a strong candidate look weak. The same CV against the
same job scored **29/100 before, 79/100 after** — the 79 is the honest number.

**3. Saving a career goal broke the Career Goals page permanently.**

`goal.workModes.map is not a function`. The database driver hands back custom
enum arrays as the raw text `'{}'` rather than an empty array, and `'{}'` is
not empty, so the existing `?? []` guard never fired. TypeScript could not see
this — the column really is `WorkMode[]` — so it needed a test at the boundary
instead. All array columns now go through one reader that handles both shapes.

**4. Production would have started with the example signing key.**

`.env.example` ships `AUTH_SECRET="dev-only-secret-change-me"`. Anyone who had
seen the repository could have forged a login for any account, with no error
and no symptom. The app now refuses to start in production with a weak or
example key, and warns in development. **Your `.env` still has the example
value** — before you deploy anywhere real, run `openssl rand -base64 32` and
paste the result in as `AUTH_SECRET`. Everyone will need to sign in again.

**5. One server action was reachable without signing in**, and empty discovery
buckets were faded to the point of being unreadable.

---

## What else changed

**Security.** All 61 server actions now require a signed-in user except the
three that cannot (sign up, sign in, sign out). Every `/[id]` page checks the
record belongs to you. File uploads are checked by extension, MIME type and
magic bytes. Stored files can no longer be reached by a `../` path.

**Errors.** Database errors, connection strings and API keys never reach the
screen. Users get a plain sentence plus a short reference code; the detail goes
to the server log under that same code.

**Privacy.** Settings now explains what is processed and where, and lets you
delete your CV, your career data, or your whole account. Deletions are
transactional and remove stored files too.

**AI cost.** Re-parsing the same document or re-pasting an identical job
description no longer calls the model a second time. Job discovery never calls
it at all.

**Accessibility.** Audited every page with axe against WCAG 2.1 AA: zero
violations. Fixed low-contrast sidebar text and avatar initials, and gave every
progress bar a name a screen reader can read. Checked at 390px, 820px and
1440px — no sideways scrolling; keyboard focus is visible throughout.

---

## Tests

```bash
npm test        # 87 tests, no database needed
npm run test:db # adds the cross-user isolation tests
```

They cover: score determinism and bounds; that Priority is not just Fit; that
nothing claims a hiring probability; deduplication; that no job source targets
a service prohibiting automated access; that an interview which ended in
rejection still counts toward your interview rate; that insights stay silent on
small samples; error sanitisation; the array bug above; both parsers; and that
one user cannot read another user's CV, career profile or applications.

That last one was checked properly — removing the `WHERE "userId" = $1` from a
query makes the test fail, so it is testing the thing it claims to test.

---

## Verified end to end

Sign up → Upload CV → Review Career Profile → Set career goal → Analyze job →
Review fit → Save opportunity → Run Dream Job Analysis → Generate pathway →
Complete a step → Track application → Update outcome → Analytics → Dashboard.

Fourteen steps, all passing against a production build, with no console errors.
