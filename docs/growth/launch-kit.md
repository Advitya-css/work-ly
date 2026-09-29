# Launch kit: weeks 1 and 2 of the $10,000 plan

Everything here is a draft for you to approve and send from your own accounts. Nothing is sent automatically. The plan itself is the "Work-ly: $10,000 by 31 December" doc.

## 0. Your setup checklist (Polar and Vercel)

Create these products in Polar as **one-time** products (not subscriptions), then put each product id in Vercel under the variable named. An offer whose variable is empty shows "email me for a payment link" instead of a buy button, so nothing breaks while you set up.

| Polar product name | Price (USD) | Vercel variable |
| --- | --- | --- |
| Work-ly Application Sprint | 149.00 | `POLAR_SPRINT_PRODUCT_ID` |
| Work-ly Coach pack (10 seats) | 250.00 | `POLAR_COACH_PACK_PRODUCT_ID` |
| Work-ly Cohort pilot (25 seats) | 750.00 | `POLAR_COHORT_PILOT_PRODUCT_ID` |
| Work-ly Cohort licence (100 seats) | 2,500.00 | `POLAR_COHORT_LICENCE_PRODUCT_ID` |
| Work-ly gift: 3-Month Pass | 49.99 | `POLAR_GIFT_PRODUCT_ID` |

Also in Vercel:

- `POLAR_FOUNDING_DISCOUNT_ID`: the founding discount (40% off, 50 redemptions, ends in 30 days).
- `SEAT_CODE_SECRET`: any long random string. Seat codes are derived from it, so set it once and never change it.
- `FOUNDER_NOTIFY_EMAIL` (optional): where "new Sprint" and "pack sold" notes go. Defaults to advitya@work-ly.in.
- For Black Friday, by 20 November: create a Polar discount that **starts 27 Nov 00:00 UTC and ends 1 Dec 00:00 UTC**, limited to the Yearly Pass product, $50.99 off (so $149.99 becomes $99.00). Then set `POLAR_SALE_DISCOUNT_ID` to its id and `SALE_NAME=Black Friday`. The banner, pricing and checkout switch on and off by themselves on those dates.

The Polar webhook must include `order.paid` (or `order.created`) and `order.refunded`. It already does if Pro purchases work today.

## 1. Founding-offer email to every signup (send this week)

Send from your own inbox, BCC in batches of up to 40, to people who haven't unsubscribed. Fill the two blanks from the pricing page on the day you send.

> **Subject:** 40% off Work-ly Pro for the first 50 members
>
> Hi,
>
> You signed up for Work-ly, so you're one of the first people to use it. Thank you.
>
> For the first 50 members, Pro is 40% off until [end date]: the 3-Month Pass is $29.99 instead of $49.99. [N] spots are left today.
>
> Pro rewrites your resume and cover letter for each job using only what's true about you, preps you for the interview, and checks new listings for you every night. Every first purchase has a 14-day money-back guarantee if you've used fewer than 10 Pro tools.
>
> If you're in a hurry to land something, there's also a new Application Sprint: for $149 I personally check five applications with you over 14 days, and it includes 3 months of Pro. It's at work-ly.in/sprint, with the real number of spots open.
>
> Either way, just reply if something in Work-ly isn't working for you. I read every email.
>
> Advitya
> Founder, Work-ly
> [business address] · Reply "unsubscribe" and I won't email you again.

Links to use: `https://work-ly.in/pricing?utm_source=email&utm_campaign=founding-oct` and `https://work-ly.in/sprint?utm_source=email&utm_campaign=founding-oct`.

## 2. Outreach emails (coaches and programs)

Ten a weekday, one person at a time, each with a real first line from their own site (the prospect sheet has a draft line for each; read it and rewrite it in your words). A "no" ends the thread.

**Coaches, email 1**

> **Subject:** A tool for your clients between sessions
>
> Hi {first name},
>
> {One specific line about their work.}
>
> I built Work-ly (work-ly.in). A job seeker pastes a posting and gets a Candidate Fit score, the gaps that matter, and a resume tailored to that posting, using only what's already on their resume.
>
> For coaches I sell 10 seats for 3 months at $250, so every client can check each application before sending it: work-ly.in/for-coaches. Would a 15-minute look be useful? If not, reply "no" and I won't write again.
>
> Advitya
> Founder, Work-ly · {business address}

**Coaches, day 4 follow-up** (make the code in admin, Seat codes, 1 seat, 3 months, label `coach-trial-{name}`)

> **Subject:** Re: A tool for your clients between sessions
>
> Hi {first name}, here is a free 3-Month Pass so you can try it on a real posting yourself: work-ly.in/redeem?code={code}. If it's useful, I'd love 15 minutes.

**Programs (bootcamps, career centres, outplacement), email 1**

> **Subject:** Checking every student's application before it goes out
>
> Hi {first name},
>
> {One specific line about their program.}
>
> I built Work-ly (work-ly.in). Each student pastes a posting and sees how their resume fits it, requirement by requirement, then gets a resume tailored to that job from their real experience only.
>
> I'm running a small number of cohort pilots this term: 25 seats for 3 months at $750, with an onboarding call, a week-6 usage report (totals only, never a student's data), and a full refund if fewer than 10 seats are used in the first 30 days. Details: work-ly.in/for-teams.
>
> Would 15 minutes to see it on a posting your students care about be useful? If not, reply "no" and I won't write again.
>
> Advitya
> Founder, Work-ly · {business address}

## 3. LinkedIn: the first three posts

Post from your own profile. Use only numbers you can stand behind.

**Post 1 (week of 5 Oct): why good candidates don't get interviews**

> I built Work-ly after watching people I know send hundreds of applications and hear nothing back.
>
> The pattern I kept seeing wasn't bad candidates. It was good candidates sending the same resume to jobs that asked for different things, so the one line that proved they could do the job was buried on page two, or missing.
>
> Before you apply, read the posting as a checklist: what does it require, and where on your resume is the proof for each line? If the proof isn't there, either add it (if it's true) or skip the job.
>
> I made a free check that does exactly this, requirement by requirement: work-ly.in/free-grader

**Post 2 (week of 12 Oct): what a fit score tells you, and what it doesn't**

> Work-ly gives every job a Candidate Fit score out of 100. People sometimes read that as "my chance of getting hired". It isn't, and I don't want anyone reading it that way.
>
> It tells you how much of what the posting asks for your resume already proves. That's useful for two decisions: whether to apply at all, and what to fix before you do.
>
> It can't see the other 200 applicants, the hiring manager's mood, or the internal candidate. Nothing honest can.
>
> So use it to decide where to spend your evening, not to predict an outcome.

**Post 3 (week of 19 Oct): the Sprint**

> I'm taking on a few people for a 14-day Application Sprint.
>
> You send me the roles you want. I review your resume and we finish five applications together: each one fit-checked, tailored, with a cover letter and a note to the hiring manager, and I read every one before it goes back to you. There's a 20-minute call halfway.
>
> $149, including 3 months of Work-ly Pro. Five finished applications in 14 days, or your money back. I run a handful at a time; the page shows how many spots are open right now: work-ly.in/sprint

Links: add `?utm_source=linkedin&utm_campaign=post-1` (2, 3...) to every link.

## 4. Reddit: how to reply

Subreddits: r/resumes, r/jobs, r/jobsearchhacks, r/careerguidance, r/cscareerquestions. Read each subreddit's rules on self-promotion first; some ban links to your own product entirely.

1. Answer the question in full in the comment itself. The reply has to be useful even if nobody clicks anything.
2. Say who you are when you mention Work-ly: "I built a free tool for this (disclosure: it's mine)".
3. Link only when it directly helps with their question, and only the free check: `work-ly.in/free-grader?utm_source=reddit&utm_campaign={subreddit}`.
4. Never post the same text twice, never use a second account, never ask for upvotes.

A reply shape that works for "I've sent 200 applications and got nothing":

> A few things that usually matter more than volume: (1) pick one role family and tailor to it, (2) for each posting, check that every "required" line has visible proof in your top third, (3) put numbers on your bullets where they're true. If you want a second pair of eyes on one posting, I built a free check that goes through a job's requirements against your resume and shows what's missing (disclosure: it's mine): {link}.

## 5. Product Hunt (launch Tuesday 20 October)

- **Name:** Work-ly
- **Tagline (60 characters max):** See if your resume fits the job before you apply
- **Description:** Paste a job posting and your resume. Work-ly checks every requirement, quotes the proof from your own resume, and shows what would get you screened out. Pro then tailors your resume and cover letter to that job, using only what's true about you.
- **First comment (yours):** why you built it, what the free check does, what Pro adds, that it never invents skills, and one honest limitation (the score is fit, not a hiring prediction). Ask for feedback, not upvotes.
- **Gallery:** (1) the free check result on a sample posting, (2) requirement-by-requirement proof, (3) a tailored resume beside the original, (4) the pricing page.
- **On the day:** answer every comment within the hour. Tell your own network the launch is live; never ask anyone to upvote.

## 6. Directory listings

Short (one line): Work-ly checks your resume against a job posting and tailors it to the job, using only what's true about you.

Long: Work-ly is AI career software for job seekers. Paste a posting to get a Candidate Fit score with the proof for each requirement and the gaps that could get you screened out. Pro tailors your resume and cover letter to each job, preps you for interviews and matches new listings every night. Free to start; Pro from $19.99/month.

Link: `https://work-ly.in/?utm_source={directory}&utm_campaign=listing`

## 7. Partner links

A coach who'd rather recommend than buy signs up at work-ly.in/partners and gets `https://work-ly.in/?ref=partner-{name}` on the spot, by email too. You get a note in your inbox. Orders from people who first arrive through a link show up in admin under "Partner payouts (30%)", with the partner's email. Pay monthly once someone is owed $25 or more.

## 8. Test every product before sharing links

Do this once, after the products and variables are set and the site is deployed. Use a second email address of your own for the buyer.

1. In Polar, create a discount code `WL-TEST-100`: 100% off, limited to 5 uses, ending tomorrow, for the five new products.
2. **Sprint:** signed in as the test account, open work-ly.in/sprint, tick the box, book, and enter the code at checkout. Check you land on the intake form, Pro shows in Settings, you got "Your Application Sprint is booked" and your own inbox got "New Sprint". Send the intake form and check the "Sprint intake" email. In admin, mark it delivered.
3. **Coach pack:** signed out, in a private window, buy from work-ly.in/for-coaches with the code. Check the thank-you page shows a COACH-... code, the buyer email has the same code, and admin lists it with 0 / 10 used.
4. **Redeem as someone new:** in another private window, open the redeem link from that email. You should land on sign-up with "Create your account to use your code". Sign up, verify, and check the "You have a Work-ly code waiting" card appears; redeem it and check Pro is on for 3 months and admin shows 1 / 10 used.
5. **Pilot, licence and gift:** buy each once the same way and check the code and email (TEAM-... for pilot and licence, GIFT-... for the gift).
6. **Refund one (if Polar allows refunding a $0 order):** refund the gift order and check its unused seat shows "(1 off)" in admin.
7. Delete the test discount code in Polar.

The test orders show as $0 in the admin revenue numbers, so they don't distort the plan.
