# Making Workly Profitable

**Where you're starting from:** Workly has real, working product — CV/profile management, job Fit scoring, Dream Job gap analysis, Pathway AI, multi-source job Discovery with alerts, application tracking with AI interview prep, and a couple of niche modes (gig/musician, student, part-time). What it does **not** have, anywhere in the codebase, is any way to charge anyone money — no Stripe, no subscriptions, no paywall of any kind. That's the honest starting point: the product exists, the business doesn't yet. Everything below is about closing that gap as directly as possible.

I haven't built any of this yet — this is the plan. Say the word on any phase and I'll start building it.

## Phase 1: Build the part that lets you charge money

This has to come first because nothing else matters until it exists. The standard, lowest-effort path for a solo-built app is Stripe: it hosts the actual payment page (Stripe Checkout) and the "manage my subscription" page (Stripe Customer Portal) for you, so you're not writing a card-entry form or handling card numbers yourself, which you shouldn't do anyway. Concretely this means: a `subscriptions` table (userId, plan, status, Stripe customer/subscription IDs, renewal date) added the same additive way every other table in this app was added; a webhook endpoint that listens for Stripe telling you someone subscribed, cancelled, or a payment failed, and updates that table; and a small `getEntitlements(userId)` helper that the rest of the app calls to ask "is this user on the paid plan," the same way the app already calls `getCurrentUser()` everywhere. This is a real, multi-day engineering task, not a quick add — but it's self-contained and I can build it with you whenever you're ready.

Before Stripe will let you accept real payments, you also need a Terms of Service and a Privacy Policy page (they check for this), and a clear refund policy. These are also worth having simply because you're already handling people's CVs and career data.

## Phase 2: Decide what's free and what's paid

Right now every feature is free and unlimited for anyone with an account. The lowest-risk way to introduce paying is a **freemium usage cap**, not a hard wall — people should be able to try the real product before being asked to pay, because right now nobody outside your own testing has actually experienced the paid version of anything.

A starting split that fits what's actually built: free accounts keep full access to the CV/career profile and a small number of job Fit analyses and Dream Job analyses per month (say, 3–5 each) — enough to get real value and see the product is trustworthy. The paid plan removes those caps, unlocks Pathway AI (the most build-intensive, differentiated feature), unlocks full Discovery with alerts across all sources instead of a capped number of results, and unlocks the AI-powered interview prep and application strategy tools. This isn't a guess pulled from nowhere — it's ranking your existing features by "how much AI/compute they cost you" and "how much of a step up they feel like," and putting the expensive, high-value ones behind the paywall first.

Enforcing the caps is a small, well-scoped piece of code: the app already has a working, Postgres-backed usage-counting system in `lib/rate-limit.ts` for security throttling. The same pattern (a row per user per month, incremented on each analysis) is the right tool for counting "analyses this month" too — you already own working infrastructure for exactly this problem.

## Phase 3: Decide what "AI-powered" actually costs you

This is the part most people skip and then get surprised by. Right now, production has no AI provider key configured — every "AI" feature (job parsing, Dream Job gap analysis, Pathway AI) is running on the deterministic heuristic engine, which costs nothing per request. That's actually a reasonable place to keep the **free tier** — it's honest, it's already tested, and it costs you nothing to serve free users.

But turning on a real AI provider (this codebase already has a working Google Gemini integration sitting unused, so that's the natural first choice) for paid users means every paid action costs you real money per call. Before you set a price, rough out the math: estimate how many AI calls a typical paying user makes per month (probably a handful of Dream Job/Pathway generations, not hundreds), multiply by Gemini's per-call cost, and make sure your subscription price comfortably clears that with room left over — not just breaks even. This is a business decision only you can make with real numbers, but the shape of the calculation is: **price > (AI cost per user) + (payment processor's ~3% cut) + (your other costs), by a healthy margin.**

## Phase 4: Pick a price

Comparable career-tools (job trackers with AI fit scoring, resume tailoring) generally sit in the $10–25/month or roughly $80–150/year range. Given Workly is earlier-stage and unproven as a paid product, I'd start conservative rather than guess high: something like **$9–12/month, or a discounted annual price around $79–99/year**, is a reasonable opening point that's easy to justify to a first wave of users and easy to adjust later. Don't treat your first price as permanent — plan to revisit it once you have real conversion data, which you won't have until Phase 1 and 2 exist.

## Phase 5: Get people to convert

You already have an email channel (Resend, already wired up for verification emails) and, if the app has any existing signups, an existing audience — the day billing goes live is worth a direct "we just launched Pro" email to every current user, not a silent rollout. Beyond that, for a solo-built app in this space, the channels that actually work without an ad budget are: a genuinely useful public write-up (a blog post walking through how the Fit/gap-analysis scoring works, which doubles as SEO for "job fit checker" type searches — the deterministic, no-fabrication design is a real differentiator worth writing about honestly, not just a features list), organic posting in job-search-focused communities where people already congregate (relevant subreddits, career-change Discord/Slack communities, LinkedIn posts showing a real Dream Job gap report), and a Product Hunt launch once billing and a couple of polish passes are done. None of this needs to wait for Phase 1–4 to fully finish — building an audience in parallel is free and the earlier you start, the more people are ready to convert the day payments go live.

## Phase 6: Watch the numbers, not your gut

Once billing exists, the two numbers that matter most are how many free users convert to paid, and how many paid users stay past month one (churn). Vercel Analytics is already a listed dependency in this project, which gives you basic traffic data for free; pair that with a simple query against your own `subscriptions` table for the conversion and churn numbers specifically. Don't add a second analytics tool or a growth dashboard product yet — at this stage a five-minute SQL query answers the two questions that matter.

## Realistic sequencing

Phases 1 and 2 are the actual bottleneck — nothing generates revenue until they exist, and Phase 1 in particular is real engineering work, not a quick toggle. Phase 3's cost math should happen *before* you flip on a live AI key for paying users, not after. Phases 4–5 can be worked out in parallel with 1–2, and Phase 6 only becomes useful once real payments are flowing. If you want to start now, the concrete next step is Phase 1: I can begin building the Stripe integration and the entitlements layer whenever you're ready — that's the piece everything else depends on.
