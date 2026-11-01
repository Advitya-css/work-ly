/**
 * THE FOUNDING TEN - personal emails from the founder to people who already
 * signed up, ranked by how close each one is to paying. Pure, so it can be
 * tested: the server part (founding-ten.ts) gathers the signals.
 *
 * Every email is drafted here and sent by hand, one at a time, from the
 * admin page (lib/outreach.ts enforces the daily cap and unsubscribes).
 * Each is short, in the founder's voice, says one true thing about what
 * the person did, and ends with a real question, because early on a reply
 * is worth more than a click.
 */

export type Heat = "checkout" | "tried" | "checked" | "resume" | "signed_up";

export const HEAT_ORDER: Heat[] = ["checkout", "tried", "checked", "resume", "signed_up"];

export const HEAT_LABEL: Record<Heat, string> = {
  checkout: "Opened checkout, didn't pay",
  tried: "Used the Pro trial",
  checked: "Checked a job",
  resume: "Added a resume only",
  signed_up: "Signed up, nothing else",
};

export interface Signals {
  name: string | null;
  email: string;
  /** Opened a Polar checkout and didn't finish, recently. */
  checkoutOpen: boolean;
  /** Had the 1-day Pro trial (the trial-ended email went out, or it's running). */
  hadTrial: boolean;
  jobsChecked: number;
  resumes: number;
  /** The latest job they checked, for one true personal line. */
  lastJob: { title: string | null; company: string | null } | null;
}

export function heatOf(s: Signals): Heat {
  if (s.checkoutOpen) return "checkout";
  if (s.hadTrial) return "tried";
  if (s.jobsChecked > 0) return "checked";
  if (s.resumes > 0) return "resume";
  return "signed_up";
}

/** "Priya" from "Priya Sharma", or null for an empty, emailish or all-caps junk name. */
export function firstName(name: string | null): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first.includes("@") || first.length > 20 || !/^\p{L}/u.test(first)) return null;
  return first[0].toUpperCase() + first.slice(1);
}

/** "Senior Data Analyst at Swiggy", "the Data Analyst role", or null. */
function jobPhrase(job: Signals["lastJob"]): string | null {
  const title = job?.title?.replace(/^title:\s*/i, "").trim();
  if (!title || title.length > 70) return null;
  return job?.company ? `${title} at ${job.company}` : `the ${title} role`;
}

export interface OfferForEmail {
  percentOff: number;
  forLife: boolean;
  spotsLeft: number | null;
  /** "$9.99", Monthly at the founding price. */
  monthlyPrice: string;
}

function offerLines(offer: OfferForEmail | null): string {
  if (!offer) return "";
  const spots = offer.spotsLeft != null ? ` (${offer.spotsLeft} left)` : "";
  const what = offer.forLife
    ? `${offer.percentOff}% off for life${spots}: ${offer.monthlyPrice} a month for as long as you stay`
    : `${offer.percentOff}% off${spots}`;
  return `\n\nI'm giving the first 10 paying members ${what}. If you want one of those spots, it's here: work-ly.in/pricing`;
}

export interface Draft {
  subject: string;
  body: string;
}

/**
 * The email for one person. Plain text, under 120 words, signed by the
 * founder. Says only what the signals show; never claims they did more.
 */
export function draftEmail(s: Signals, offer: OfferForEmail | null): Draft {
  const hi = `Hi ${firstName(s.name) ?? "there"},`;
  const me = "I'm Advitya, I built Work-ly.";
  const job = jobPhrase(s.lastJob);
  const sign = "\n\nAdvitya\nFounder, Work-ly";

  switch (heatOf(s)) {
    case "checkout":
      return {
        subject: "You got as far as checkout",
        body: `${hi}\n\n${me} I saw you got as far as checkout and stopped. Fair enough, and I'd really like to know why: was it the price, or did Work-ly not feel worth it yet?\n\nEither answer helps me more than you'd think. Just hit reply.${offerLines(offer)}${sign}`,
      };
    case "tried":
      return {
        subject: job ? `Your application for ${job}` : "What did you make of the Pro trial?",
        body: `${hi}\n\n${me} You tried Pro${job ? ` on ${job}` : ""}. Anything it wrote for you is still saved in your account.\n\nHonest question: was the resume and letter it wrote good enough to send? If not, what was off? I read every reply.${offerLines(offer)}${sign}`,
      };
    case "checked":
      return {
        subject: job ? `About ${job}` : "Did Work-ly's answer match your gut?",
        body: `${hi}\n\n${me} You checked ${job ?? "a job"} with Work-ly. Did the verdict match your gut, or did it get something wrong?\n\nIf it's a job you want, Work-ly can now write the whole application for it from your real experience: the resume, a cover letter, a note to the hiring manager and interview prep.${offerLines(offer)}${sign}`,
      };
    case "resume":
      return {
        subject: "One job you're unsure about?",
        body: `${hi}\n\n${me} You added your resume but haven't checked a job yet. Got one posting you keep going back and forth on? Paste it here and you'll get a straight answer, apply or skip, with the lines from your resume behind it: work-ly.in/analyze-job\n\nIt takes about a minute. And if anything confused you, tell me what. I've just reworked the first-time experience and want to know if it's clearer.${sign}`,
      };
    default:
      return {
        subject: "What were you hoping Work-ly would do?",
        body: `${hi}\n\n${me} You signed up a while ago but didn't get further, which usually means I didn't make it clear enough what to do first. That's on me.\n\nWhat were you hoping it would help with? One line is plenty. Or try the one-minute check: paste a job and your resume at work-ly.in and it tells you honestly whether to apply.${sign}`,
      };
  }
}
