/**
 * PROBLEM PAGES - one page per question a job seeker actually types.
 *
 * Each answers the question honestly on its own (so it deserves to rank),
 * then hands off to the free check, which is where the answer becomes
 * personal. No invented statistics or testimonials: every claim here is
 * either general hiring practice or a description of what Work-ly does.
 */

export interface LandingSection {
  heading: string;
  items: { title: string; body: string }[];
}

export interface LandingPage {
  slug: string;
  /** <title> and H1. */
  title: string;
  metaDescription: string;
  eyebrow: string;
  lead: string;
  sections: LandingSection[];
  ctaTitle: string;
  ctaBody: string;
  faq: { q: string; a: string }[];
}

export const LANDING_PAGES: Record<string, LandingPage> = {
  "why-am-i-not-getting-interviews": {
    slug: "why-am-i-not-getting-interviews",
    title: "Why am I not getting interviews?",
    metaDescription:
      "The common reasons applications get screened out before an interview, and a free check that shows which ones apply to your resume for a specific job.",
    eyebrow: "No replies? Find out why",
    lead:
      "When application after application goes quiet, the reason is usually not you. It's what a screener can see in the first minute. These are the common causes, and one free check shows which apply to you for a real job.",
    sections: [
      {
        heading: "The usual reasons applications stall",
        items: [
          {
            title: "A must-have isn't visible on your resume",
            body: "You may have the skill, but if the resume never shows it, a screener has to assume you don't. Must-haves that are missing, or only implied, are one of the most common reasons for a fast no.",
          },
          {
            title: "Your lines describe duties, not proof",
            body: "\"Responsible for reporting\" says what the job was. \"Cut the weekly report from 6 hours to 25 minutes\" shows you did it well. Screeners look for evidence: tools, numbers, outcomes.",
          },
          {
            title: "The posting's own words aren't there",
            body: "Recruiters and applicant tracking systems search for the terms the job uses. If the job says \"stakeholder reporting\" and your resume says \"presentations\", the match can be missed even when the experience is the same.",
          },
          {
            title: "The level doesn't line up",
            body: "Applying well above your years of experience, or well below them, both get filtered. A role one step up is realistic; three steps usually isn't.",
          },
          {
            title: "Location or work authorisation rules you out",
            body: "Many roles screen on location, time zone or right to work before anyone reads the rest. It's worth checking before you spend time tailoring.",
          },
          {
            title: "The same resume goes to every job",
            body: "A general resume undersells you for each specific role. The strongest applications lead with what that one job asks for first.",
          },
        ],
      },
    ],
    ctaTitle: "See which of these is stopping you",
    ctaBody:
      "Paste one job you want and your resume. Work-ly checks every requirement, quotes the line that proves it (or says nothing does), and tells you what would get you screened out. The first check needs no account.",
    faq: [
      {
        q: "Is this an ATS keyword score?",
        a: "No. Work-ly reads each requirement and looks for real evidence on your resume, quoting it. A keyword count can't tell a real match from a listed buzzword.",
      },
      {
        q: "Will it tell me my chances of getting hired?",
        a: "No, and nothing honest can. Candidate Fit measures how well your resume shows the job's requirements, which is the part you control.",
      },
    ],
  },

  "should-i-apply": {
    slug: "should-i-apply",
    title: "Should I apply for this job?",
    metaDescription:
      "How to decide whether a job is worth applying to, and a free check that reads the posting against your resume and gives a clear Apply, Stretch or Skip.",
    eyebrow: "Apply, stretch or skip",
    lead:
      "Applying to everything wastes the time you need for the jobs you could actually get. A simple rule works well: apply when your resume clearly shows most of the must-haves. Here's how to judge that, and a free check that does it for you.",
    sections: [
      {
        heading: "How to decide in five minutes",
        items: [
          {
            title: "Separate must-haves from nice-to-haves",
            body: "Postings mix hard requirements (\"3+ years of SQL\", \"right to work in the UK\") with wish lists. Only the must-haves decide whether to apply.",
          },
          {
            title: "For each must-have, find your proof",
            body: "Point to the line on your resume that shows it. If you can't, the screener can't either, even if it's true.",
          },
          {
            title: "Missing one? Usually still apply",
            body: "Missing one must-have with strong evidence everywhere else is a reasonable stretch. Missing several is usually a no, however good the rest looks.",
          },
          {
            title: "Check the level and the logistics",
            body: "Seniority, location and work authorisation filter people out before anything else. Confirm them before you tailor anything.",
          },
        ],
      },
    ],
    ctaTitle: "Get a straight answer for one job",
    ctaBody:
      "Paste the job and your resume. Work-ly marks each requirement as shown, partly shown or not shown, quotes your evidence, and recommends Apply, Stretch or Low priority. A missing must-have lowers the score, so the number can't flatter you. The first check is free, with no account.",
    faq: [
      {
        q: "How is the Candidate Fit score worked out?",
        a: "From the requirement-by-requirement verdicts, weighted by how important each requirement is. Missing must-haves cap the score.",
      },
      {
        q: "What happens to my resume?",
        a: "It's used to run your check. Work-ly uses Google's paid Gemini API, which doesn't train on what you send.",
      },
    ],
  },

  "resume-job-match": {
    slug: "resume-job-match",
    title: "Check your resume against a job description",
    metaDescription:
      "A free resume-to-job match that checks every requirement, quotes the evidence on your resume and lists what's missing, instead of counting keywords.",
    eyebrow: "Resume vs job description",
    lead:
      "Most resume matchers count keywords. Work-ly reads each requirement in the job and looks for proof on your resume, quoting the exact line, so you know what a screener will actually see.",
    sections: [
      {
        heading: "What the check gives you",
        items: [
          {
            title: "Every requirement, one by one",
            body: "Each must-have and nice-to-have in the posting is marked as shown, partly shown or not shown on your resume.",
          },
          {
            title: "The quote that proves it",
            body: "For each match, the line from your resume that shows it. No quote, no credit, so the result can't be padded.",
          },
          {
            title: "What could screen you out",
            body: "The missing must-haves, listed first, with what would close each gap.",
          },
          {
            title: "A Candidate Fit score you can trust",
            body: "Worked out from those verdicts, not from how many keywords overlap. Missing must-haves cap it.",
          },
        ],
      },
    ],
    ctaTitle: "Match your resume to a job now",
    ctaBody:
      "Paste the job description and your resume. The first check is free and needs no account. With Pro, Work-ly then rewrites your resume and cover letter for that job, using only what's already true about you.",
    faq: [
      {
        q: "Does it add skills I don't have?",
        a: "Never. Missing skills are shown as gaps and left off tailored resumes until you can back them up.",
      },
      {
        q: "Which jobs does it work for?",
        a: "Any posting with a written description. It's strongest for professional roles where requirements are spelled out, such as data, analytics, product, engineering and operations.",
      },
    ],
  },
};
