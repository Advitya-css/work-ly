# Workly — Full Code Audit (Security + Functional)

Date: 2026-08-24
Scope: entire live codebase (`Downloads/workly`), all severities, security and functional correctness.

---

## How to read this

Findings are graded Critical / High / Medium / Low, security and functional together, ranked by real-world impact. Each one names the file/line, explains the concrete way it breaks, and says what fixing it would involve. Nothing here has been fixed yet — this is the "find" pass you asked for; say the word and I'll start remediating, in this same priority order.

---

## Critical

### C-1. A single resume upload can take the whole server down (ReDoS)
**File:** `src/lib/validation/document-authenticity.ts:329`

The email-detection regex (`/[\w.+-]+@[\w-]+\.[\w.-]{2,}/`) has nested unbounded quantifiers next to each other, which is the classic shape for catastrophic backtracking. Fed a crafted string (e.g. a run of `a` characters with no `@`), the regex engine's runtime blows up exponentially instead of failing fast.

The real danger is *where* this runs: `parse-document.ts:86-102` calls `checkAuthenticity()` on the **full extracted document text with no length cap** — the 20,000-character cap that exists elsewhere (`resume-ai.ts:140`) is applied later, downstream of this check. Anyone can upload a resume-shaped file containing a few KB of adversarial text and freeze the Node process handling it — and because Node is single-threaded for CPU work, that freezes the app for *every other user* too, not just the uploader.

**Fix direction:** cap input length before any regex authenticity check runs (move the cap earlier, not just add one), and rewrite the email regex to avoid adjacent unbounded classes (or use a bounded, atomic-group-free pattern / a small hand-written scanner).

### C-2. Job-URL fetcher can be used to probe or exfiltrate your internal network (SSRF)
**File:** `src/lib/jobs/fetch-url.ts:23-47`

`fetchJobPostingText()` only checks that the URL's protocol is `http`/`https` — there's no check on the resolved IP or hostname. A user can submit a job URL pointing at `http://169.254.169.254/...` (cloud metadata endpoints), `http://localhost:PORT/...`, or any internal-only address the server can reach, and the **response body is fetched, stripped, and stored** — meaning a successful SSRF here doesn't just probe for a service being up, it can exfiltrate the actual response content back to the attacker through the job description field. `redirect: "follow"` is also set explicitly, so even a URL that starts out pointing at a legitimate external host can be redirected server-side into an internal one after the initial check.

**Fix direction:** resolve the hostname and reject private/loopback/link-local ranges (RFC1918, 127.0.0.0/8, 169.254.0.0/16, ::1, fc00::/7) before fetching; re-check after every redirect hop rather than trusting `follow`; consider disabling redirects and handling one hop manually so each hop gets the same IP check.

---

## High

### H-1. Same SSRF pattern in the discovery source fetcher, plus a buffer-before-cap bug
**File:** `src/lib/discovery/sources/base.ts:76-100`

`fetchWithGuards()` has the same missing-IP-allowlist gap as C-2 — any custom RSS/JSON feed URL a user configures as a discovery source can point at an internal address. It also buffers the response body fully before enforcing any size cap (the cap is checked *after* `.text()`/`.json()` resolves), so a malicious or misconfigured feed can memory-exhaust the process before the size check ever fires.

**Fix direction:** same IP-allowlist fix as C-2, plus switch to streaming with a byte-counting reader that aborts once the cap is exceeded (the pattern `fetch-url.ts` already gets right for its own 3MB cap).

### H-2. Upload body fully buffered before the size limit is checked
**File:** `src/app/api/documents/route.ts:23-29`

`request.formData()` reads and buffers the entire multipart body into memory *before* `validateResumeFile()` gets a chance to reject it for being too large. A user (or attacker) can upload an oversized file and the memory cost is paid regardless of what the size check later decides — the check exists but arrives too late to prevent the cost it's meant to prevent.

**Fix direction:** enforce a `Content-Length` ceiling at the request level (reject before touching the body) rather than only validating the parsed `File` object after the fact.

---

## Medium

### M-1. No security headers anywhere
**File:** `next.config.ts` (11 lines total, no `headers()` block)

There's no CSP, no `X-Frame-Options`/`frame-ancestors`, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Strict-Transport-Security`. This doesn't cause a breach by itself, but it removes a whole layer of defense-in-depth against clickjacking and content-sniffing, and means any future XSS-shaped bug (even a small one) has nothing standing between it and full script execution.

**Fix direction:** add a `headers()` export in `next.config.ts` with at minimum CSP (start in report-only mode to see what breaks), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

### M-2. Second ReDoS candidate
**File:** `src/lib/ai/providers/resume-heuristic.ts:74-77`

The `DATE_RANGE` regex has a space inside a separator character class combined with other repeated groups, which is a milder version of the same backtracking shape as C-1 — not proven catastrophic in quick testing, but structurally the same risk class, feeding on the same uncapped resume text.

**Fix direction:** same treatment as C-1 — cap input length before this runs, and simplify the character class so the separator can't itself backtrack against adjacent groups.

### M-3. No rate limiting anywhere in the app
Every mutating endpoint — resume upload, job submission/parsing (which calls a paid AI provider), discovery runs — has no per-user or per-IP rate limit. Combined with C-1/M-2 (CPU-cost regexes) and the AI calls in the parse pipeline, this means a single user can also generate unbounded API cost against your AI provider key, not just a DoS.

**Fix direction:** add rate limiting (even a simple in-memory or DB-backed token bucket keyed by userId) on `submitJob`/`parseJob` and the upload endpoint at minimum — those are the two paths with real external cost (AI calls) or real CPU cost (regex/parsing).

### M-4. Grounding drop-log leaks raw AI output into server logs unredacted
**Files:** `src/lib/career/parse-document.ts:120-124`, `src/lib/jobs/analyze-job.ts:94-98`

When the grounding step drops an unverifiable AI-extracted claim, it logs the raw dropped value via `console.warn` — including up to 8 verbatim field/value pairs — without going through the `redact()` sanitizer in `src/lib/errors.ts` that the rest of the app correctly uses for error logging. If a resume or job posting happens to contain something sensitive in a field the AI mis-extracted (a phone number, an internal ticket reference, anything), it lands in plaintext server logs.

**Fix direction:** route these through the same `redact()` used elsewhere, or at minimum stop logging raw values and log field names + lengths only.

### M-5. Job/user-supplied `description` field isn't stripped before reaching the AI prompt (prompt-injection surface)
Job descriptions and CV text are user-controlled and get sent directly into the AI parsing/scoring prompts. There's no visible stripping of prompt-injection-shaped content ("ignore previous instructions", fake system-role markers, etc.) before that text is interpolated into the prompt sent to the AI provider. The blast radius today is contained by the fact that outputs are grounded and constrained by the extraction schema, but that's incidental protection, not designed protection — a sufficiently clever injection could still try to steer tone/wording within the fields the schema allows.

**Fix direction:** not urgent to fix given the grounding safety net already in place, but worth a dedicated pass if the AI provider ever gets more output surface (e.g. free-text fields it can populate without grounding checks).

---

## Low

### L-1. `Content-Disposition` filename sanitization is incomplete
**File:** `src/app/api/documents/[id]/route.ts:29`

Only strips `"` from the filename before building the header. A filename containing `\r\n` (CRLF) or other control characters isn't stripped, which is the classic header-injection shape, though modern browsers/HTTP libraries generally reject raw CRLF in header values before this could turn into a full response-splitting attack.

**Fix direction:** whitelist-filter the filename to a safe character set instead of blacklisting one character.

### L-2. Raw AI provider error body logged
**File:** `src/lib/ai/providers/openai-compatible.ts:102-111`

Logs the AI provider's raw error response server-side. Log-only impact — this never reaches the user, `safeMessage()` correctly sanitizes what does — but the raw body could contain your account/org identifiers depending on what the provider returns in error payloads.

### L-3. `url` field not validated as an actual URL
**File:** `src/lib/validations/job-input.ts:7`

The `url` field in the job-input schema isn't constrained with `.url()`, so malformed input reaches `fetchJobPostingText()` before that function's own `try/catch` around `new URL()` catches it. Not exploitable — it just means validation errors surface later and less precisely than they could.

### L-4. No rate limiting (cross-reference)
Same underlying gap as M-3; listed here because a couple of the less-costly endpoints (e.g. plain reads) would only need basic rate limiting, not the AI-cost-aware version M-3 calls for.

### L-5. Auth middleware matcher omits `/discover` and `/student`
**File:** `src/proxy.ts`

Both page trees do their own server-side ownership/auth checks (confirmed in `tests/isolation.test.ts`'s static analysis, which passes), so this isn't a live bypass today — but it means those two areas rely entirely on remembering to keep that per-page check in place, rather than being covered by the shared middleware net everything else gets. One missed check in a future page under either tree would be a real bypass with nothing else catching it.

**Fix direction:** add both prefixes to the middleware matcher for defense-in-depth, even though today's pages are individually correct.

---

## Verified correct (worth stating plainly, not just what's broken)

- **SQL injection:** all 158 raw `pool.query`/`client.query` call sites use parameterized queries (`$1`, `$2`, ...) — zero string-interpolated SQL found anywhere in the codebase.
- **File upload safety:** resume parsing correctly rejects non-resume content via the authenticity gate (once C-1's input cap is fixed, this check itself is sound); DOCX/PDF parsing goes through `mammoth`/`pdf-parse` with the decompression-bomb concern being about missing input-size limits (covered under C-1/M-3) rather than the parsers themselves being unsafe.
- **Secret handling:** `.env` values are never logged; `redact()` in `src/lib/errors.ts` correctly scrubs API keys, connection strings, and stack traces from every user-facing error path that uses it (the gap is M-4, one specific log call site that bypasses it, not the sanitizer itself).
- **Session/auth:** every server action checked calls `getCurrentUser()` and verifies resource ownership (`resource.userId === user.id`) before returning data; `tests/isolation.test.ts` statically enforces this for every exported server action and dynamic page route, and passes.
- **Cross-user data isolation:** no query found anywhere that fetches a CV, career profile, application, or job by ID without also filtering on `userId` — the one-user-per-user-data rule holds throughout.
- **Database transactions:** the only two files using explicit `BEGIN`/`COMMIT`/`ROLLBACK` (`src/lib/db/career-pathways.ts`, `src/lib/privacy/actions.ts`) both correctly release the client in a `finally` block — no connection leak on error.

---

## Functional-correctness findings

### F-1 (Medium). The submit→parse→analyze→sync pipeline isn't atomic, and its own failure-recovery path creates silent duplicates
**File:** `src/lib/jobs/analyze-job.ts:196-231` (`submitParseAndAnalyzeJob`)

The four pipeline steps (`submitJob` → `parseJob` → `analyzeJob` → `syncOpportunityForJob`) run as four separate, non-transactional calls. If a failure happens *after* `parseJob` succeeds but *before* `analyzeJob`/`syncOpportunityForJob` complete (a DB blip, a scoring exception), the `Job` row is left permanently sitting in `PARSED` status with no `JobAnalysis` and no `Opportunity` — and there's no UI anywhere that lists raw `Job` rows (only `Opportunity` rows are shown to the user), so this row becomes invisible and unrecoverable through the app.

It gets worse on retry. The dedup check at the top of the same function (`findParsedJobByRawInput`) exists specifically to catch a user re-submitting identical text and reuse the existing job instead of re-parsing. When it finds that stuck `PARSED` job with no opportunity, it tries `syncOpportunityForJob()` to rebuild just the missing part — but that function immediately throws `"This job hasn't been analyzed yet"` (there's no analysis to sync from), the `catch` around it silently swallows that and **falls through to a completely fresh submission**: a brand-new `Job` row, a brand-new AI parse call, a brand-new opportunity. The original stuck row is never cleaned up or linked, and every future identical re-submission repeats the same failed-rebuild-then-duplicate dance. This directly undermines the cost-control/dedup mechanism the function's own comments describe as its purpose.

**Fix direction:** either wrap the whole pipeline in a DB transaction with compensating cleanup on failure, or — simpler given the AI call in the middle can't sensibly be inside a DB transaction — add a background sweep that finds `PARSED` jobs older than N minutes with no analysis and either retries them or marks them `FAILED` so they stop being silently invisible, and change the rebuild `catch` to re-run `analyzeJob` + `syncOpportunityForJob` on the *existing* job instead of falling through to a new `submitJob`.

### F-2 (Low). Manually-created applications skip the "at or past applied" date-stamping for WITHDRAWN status
**File:** `src/lib/db/applications.ts:166-169`

`statusIsAtOrPastApplied()` special-cases `REJECTED` (`|| status === "REJECTED"`) so a manually-created application already in a terminal state still gets a sensible `dateApplied`, but doesn't do the same for `WITHDRAWN`. Creating a manual application directly with `status: "WITHDRAWN"` leaves `dateApplied` null. Low impact: analytics (`analytics.ts:88`) already falls back to `createdAt` when `dateApplied` is null, so this doesn't corrupt the numbers, just leaves a slightly wrong-looking null in the raw data for that one edge case.

**Fix direction:** change the condition to `|| status === "REJECTED" || status === "WITHDRAWN"`.

### F-3 (Low / informational). Discovery run processes results sequentially, not in parallel
**File:** `src/lib/discovery/run.ts:223-280`

The loop over `accepted` listings `await`s the embedding call and the DB upsert one listing at a time. Not a correctness bug — dedup logic correctly depends on having already-processed results available for the batch-clash check, so full parallelism isn't free here — but it means a discovery run with many results from an active source will take noticeably longer than necessary, since embedding + upsert for listing N+1 never starts until listing N's DB write finishes.

**Fix direction:** low priority; if discovery run latency becomes a real complaint, batch the embedding calls (they don't need to be sequential with each other) and only serialize the parts that actually depend on order (the in-batch dedupe comparisons).

---

## Areas checked and confirmed solid (functional side)

- **Scoring/coverage system** (`shared.ts`, `coverage.ts`): the confidence/coverage machinery built earlier this session is internally consistent — `component()` fails closed to `unavailable` on any non-finite score, `totalFrom()` correctly excludes unmeasurable weight from the denominator rather than scoring it as zero, and the UI (`score-readout.tsx`) imports the same `MIN_COVERAGE_FOR_SCORE` constant the engine uses rather than duplicating the number.
- **Postgres array-column handling:** every native array column (`skills`, `preferredLocations`, `requiredSkills`, `preferredSkills`, `secondaryTargetRoles`, `industries`, `countries`, `workModes`, `employmentTypes`) is routed through the shared `toArray()` helper in every one of the five files that read those columns — no raw/unwrapped array access found.
- **Date/duration arithmetic:** both `estimateYearsExperience` (scoring) and `estimateYears` (resume heuristic parser) filter out entries with unparseable or nonsensical (`end < start`) dates *before* using them in the average/sum, rather than letting a bad row silently propagate a `NaN`. This matches the fix already applied earlier this session and is consistently applied in the second location too.
- **Sort/compare functions:** the null-unsafe-comparator bug class (undefined values reaching a numeric `.sort()` comparator) was checked across every `.sort((a,b) => ...)` call site in `src/lib` — each one either filters non-comparable entries out beforehand or falls back to a safe default rank (`?? 9`, `?? 1`) for unrecognized keys, so a `NaN`-comparator scenario wasn't found.
- **Analytics correctness:** `applications/analytics.ts` computes interview/offer rates from milestone timestamps (`reachedInterviewAt`, etc.) rather than current status, specifically so a later rejection doesn't erase the fact that an interview happened — verified this is implemented correctly end-to-end, including that `REJECTED`/`WITHDRAWN` are deliberately excluded from the milestone-inference `STAGE_ORDER` so a direct-to-rejected application doesn't get retroactively (and wrongly) credited with reaching assessment/interview/offer stages it never reached.
- **Discovery dedup:** cross-source URL/company/title/location/description-similarity matching is deliberately conservative (ambiguous cases are kept separate rather than merged), which is the safer failure mode for this product.
- **DB transactions:** confirmed correct, see security section above (same finding applies to both halves of the audit).

---

## Suggested next step

Nothing has been changed yet. If you want me to start fixing, I'd go in this order: **C-1 and C-2 first** (both are real, exploitable, and cheap to fix), then H-1/H-2, then F-1 (the stuck-job pipeline bug, since it's actively producing bad data every time it triggers), then the Medium/Low items as a batch.
