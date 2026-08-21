import { describe, it, expect } from "vitest";

import {
  checkAuthenticity,
  type AuthenticityResult,
  type DocumentKind,
} from "@/lib/validation/document-authenticity";

/**
 * These tests exist because the app used to build a career profile out of
 * anything at all. A shopping list produced skills, a lorem ipsum paste
 * produced experience, and the match score that came out afterwards looked
 * exactly as authoritative as one built from a real CV.
 *
 * The fixtures below are therefore the point of the file, not scaffolding for
 * it. Two things are being protected at once and they pull in opposite
 * directions: junk must be refused, and a genuine CV that came out of a PDF
 * badly must NOT be refused, only flagged. Anything that makes the first set
 * stricter should be checked against BADLY_FORMATTED_CV before it ships.
 */

const REAL_CV = `PRIYA SHARMA
London, United Kingdom
priya.sharma@example.com | +44 7700 900123 | linkedin.com/in/priyasharma

PROFILE
Product analyst with six years of experience in retail and logistics,
focused on experimentation and commercial reporting.

EXPERIENCE

Product Analyst - Northwind Retail, London
March 2022 - Present
- Built the A/B testing analysis pipeline in SQL and Python.
- Owned the weekly trading dashboard used by the commercial team.
- Led the migration of reporting from spreadsheets to dbt.

Data Analyst - Harborview Logistics, Manchester
July 2019 - February 2022
- Automated the daily operations report, saving around six hours a week.
- Worked with warehouse managers to define delivery performance metrics.

EDUCATION
BSc Mathematics and Statistics, University of Manchester
2015 - 2019

SKILLS
SQL, Python, dbt, Tableau, A/B testing, experimental design
`;

const REAL_JOB_POSTING = `Senior Product Analyst
Meridian Commerce - London, United Kingdom (Hybrid, 3 days in office)
£68,000 - £82,000 per year, full time, permanent

About us
Meridian Commerce runs the checkout behind more than 400 independent
retailers. Our team is twelve people and we are hiring our second analyst.

Responsibilities
- Own the experimentation programme end to end.
- Partner with product managers to size and evaluate opportunities.
- Maintain the reporting layer in dbt.

Requirements (must have)
- 5+ years of experience in a product or data analytics role.
- Expert SQL, including window functions and CTEs.
- Strong Python for analysis.

Nice to have
- Familiarity with Looker or Tableau.

Benefits include a 10% pension contribution and 28 days holiday.
To apply, send a CV and a short note about a decision you changed with data.
`;

/**
 * A real CV that has been through a two column PDF and come out flattened:
 * the sidebar holding dates and headings is gone, everything runs together.
 * This is the case that must stay usable. It should warn, never reject.
 */
const BADLY_FORMATTED_CV = `Priya Sharma priya.sharma@example.com
Product analyst, retail and logistics, based in London
Northwind Retail, London Built the A/B testing analysis pipeline in SQL and
Python and owned the weekly trading dashboard used by the commercial team,
also led the migration of reporting from spreadsheets into a managed
warehouse Harborview Logistics, Manchester Automated the daily operations
report and worked with warehouse managers to define delivery metrics
University of Manchester, BSc Mathematics and Statistics
SQL, Python, dbt, Tableau, experimental design, stakeholder communication
`;

const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit,
sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit
esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
`;

const KEYBOARD_MASH = `asdkjfhg lkjhgfds zxcvbnm qwrtypsdfg hjklzxcv bnmqwrt
sdfghjkl mnbvcxzq wertyuip lkjhgfdsa zxcvbnmqw ertyuiop asdfghjkl qwertzxcv
nbvcxzlkj hgfdsapoi uytrewqmn bvcxzasdf ghjklpoiu ytrewqzxc vbnmasdfg hjklqwer
tyuiopmnb vcxzasdfg hjklzxcvb nmqwertyu iopasdfgh jklzxcvbn mqwertyui opasdfgh
zxcvbnmlk jhgfdsapo iuytrewqm nbvcxzasd fghjklpoi uytrewqzx cvbnmasdf ghjkqwer
qwrtzxcvb nmlkjhgfd sapoiuytr ewqmnbvcx zasdfghjk lpoiuytre wqzxcvbnm asdfghjk
mnbvcxzlk jhgfdsqwe rtzxcvbnm lkjhgfdsa poiuytrew qmnbvcxza sdfghjklp oiuytrew
`;

const SHOPPING_LIST = `Weekly shop
2 pints of semi skimmed milk
Wholemeal bread, seeded if they have it
Six free range eggs
Cheddar, the mature one not the mild one
Bag of red onions
Tin of chopped tomatoes x4
Olive oil, the big bottle
Bananas and a punnet of strawberries
Chicken thighs for Thursday
Rice, basmati
Washing up liquid
Bin bags, the drawstring ones
Toothpaste and shower gel
Coffee beans from the deli counter
Dark chocolate for baking
Cat food, the fish variety pack
Kitchen roll
Frozen peas and oven chips
Lemonade for the weekend
`;

const REPEATED_LINES = `Experienced product analyst delivering insight across trading teams.
Experienced product analyst delivering insight across trading teams.
Experienced product analyst delivering insight across trading teams.
Experienced product analyst delivering insight across trading teams.
Experienced product analyst delivering insight across trading teams.
Experienced product analyst delivering insight across trading teams.
Experienced product analyst delivering insight across trading teams.
Experienced product analyst delivering insight across trading teams.
`;

const REPEATED_WORD = `banana banana banana banana banana banana banana banana
banana banana banana banana banana banana banana banana banana banana banana
banana banana banana banana banana banana banana banana banana banana banana
banana banana banana banana banana banana banana banana banana banana banana
banana banana banana banana banana banana banana banana banana banana banana
`;

const TOO_SHORT_CV = `Priya Sharma
Product analyst, London
priya.sharma@example.com
`;

const TOO_SHORT_JOB = `Analyst wanted. Apply within.`;

function signal(result: AuthenticityResult, id: string) {
  return result.signals.find((entry) => entry.id === id);
}

function check(text: string, kind: DocumentKind) {
  return checkAuthenticity(text, kind);
}

describe("genuine documents are accepted", () => {
  it("accepts a normal CV with high confidence", () => {
    const result = check(REAL_CV, "resume");

    expect(result.verdict).toBe("accept");
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.kind).toBe("resume");
    expect(signal(result, "has-date-ranges")?.present).toBe(true);
    expect(signal(result, "has-contact-details")?.present).toBe(true);
    expect(signal(result, "has-cv-sections")?.present).toBe(true);
    expect(signal(result, "has-employment-language")?.present).toBe(true);
    expect(signal(result, "has-multi-line-structure")?.present).toBe(true);
  });

  it("accepts a normal job posting with high confidence", () => {
    const result = check(REAL_JOB_POSTING, "job-posting");

    expect(result.verdict).toBe("accept");
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(signal(result, "has-requirement-language")?.present).toBe(true);
    expect(signal(result, "has-employment-terms")?.present).toBe(true);
    expect(signal(result, "has-company-or-application")?.present).toBe(true);
    expect(signal(result, "has-role-title")?.present).toBe(true);
  });

  it("does not accept a CV when it is checked as a job posting", () => {
    // Cross checking the two kinds is the cheapest guard against the signals
    // being so generic that any prose passes either way.
    const asJob = check(REAL_CV, "job-posting");
    expect(asJob.verdict).not.toBe("accept");
  });
});

describe("a genuine but badly extracted CV warns rather than rejects", () => {
  it("warns, because refusing it would be worse than the bug being fixed", () => {
    const result = check(BADLY_FORMATTED_CV, "resume");

    expect(result.verdict).toBe("warn");
    expect(result.confidence).toBeGreaterThanOrEqual(0.35);
    expect(result.confidence).toBeLessThan(0.6);
    expect(result.message).toContain("Check the parsed details carefully");
  });
});

describe("filler and nonsense are rejected", () => {
  it("rejects lorem ipsum", () => {
    const result = check(LOREM_IPSUM, "resume");

    expect(result.verdict).toBe("reject");
    expect(result.confidence).toBeLessThanOrEqual(0.2);
    expect(signal(result, "not-placeholder-text")).toBeDefined();
    expect(result.message.toLowerCase()).toContain("placeholder");
  });

  it("rejects lorem ipsum pasted as a job posting too", () => {
    expect(check(LOREM_IPSUM, "job-posting").verdict).toBe("reject");
  });

  it("rejects keyboard mashing", () => {
    const result = check(KEYBOARD_MASH, "resume");

    expect(result.verdict).toBe("reject");
    expect(result.confidence).toBeLessThanOrEqual(0.2);
    expect(signal(result, "readable-words")).toBeDefined();
  });

  it("rejects a document that is one line repeated", () => {
    const result = check(REPEATED_LINES, "resume");

    expect(result.verdict).toBe("reject");
    expect(signal(result, "varied-lines")).toBeDefined();
  });

  it("rejects a document that is one word repeated", () => {
    const result = check(REPEATED_WORD, "resume");

    expect(result.verdict).toBe("reject");
    expect(signal(result, "varied-wording")).toBeDefined();
  });
});

describe("real text about the wrong subject is rejected", () => {
  it("rejects a shopping list uploaded as a CV", () => {
    const result = check(SHOPPING_LIST, "resume");

    // The point of this case: the text is perfectly readable English laid out
    // over many lines, so only the content signals can catch it.
    expect(result.verdict).toBe("reject");
    expect(signal(result, "has-date-ranges")?.present).toBe(false);
    expect(signal(result, "has-cv-sections")?.present).toBe(false);
    expect(signal(result, "has-contact-details")?.present).toBe(false);
    expect(result.message).toContain("This doesn't look like a CV.");
    expect(result.message).toContain("Workly couldn't find");
  });

  it("rejects a shopping list pasted as a job posting", () => {
    expect(check(SHOPPING_LIST, "job-posting").verdict).toBe("reject");
  });
});

describe("input that is too short to judge is rejected", () => {
  it("rejects a three line CV", () => {
    const result = check(TOO_SHORT_CV, "resume");

    expect(result.verdict).toBe("reject");
    expect(signal(result, "enough-text-to-read")).toBeDefined();
    expect(result.message).toContain("isn't enough text");
  });

  it("rejects a one line job posting", () => {
    const result = check(TOO_SHORT_JOB, "job-posting");

    expect(result.verdict).toBe("reject");
    expect(signal(result, "enough-text-to-read")).toBeDefined();
  });

  it("rejects empty and whitespace input without throwing", () => {
    for (const kind of ["resume", "job-posting"] as const) {
      expect(check("", kind).verdict).toBe("reject");
      expect(check("   \n\n\t  ", kind).verdict).toBe("reject");
    }
  });
});

describe("result shape and user facing copy", () => {
  it("scores signal weights that sum to one for both kinds", () => {
    for (const [text, kind] of [
      [REAL_CV, "resume"],
      [REAL_JOB_POSTING, "job-posting"],
    ] as const) {
      const total = check(text, kind).signals.reduce((sum, entry) => sum + entry.weight, 0);
      expect(total).toBeCloseTo(1, 5);
    }
  });

  it("keeps confidence inside 0 to 1 and consistent with the verdict", () => {
    const samples: Array<[string, DocumentKind]> = [
      [REAL_CV, "resume"],
      [BADLY_FORMATTED_CV, "resume"],
      [SHOPPING_LIST, "resume"],
      [LOREM_IPSUM, "resume"],
      [KEYBOARD_MASH, "resume"],
      [REAL_JOB_POSTING, "job-posting"],
      [TOO_SHORT_JOB, "job-posting"],
    ];

    for (const [text, kind] of samples) {
      const result = check(text, kind);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      if (result.verdict === "accept") expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      if (result.verdict === "warn") expect(result.confidence).toBeGreaterThanOrEqual(0.35);
      if (result.verdict === "warn") expect(result.confidence).toBeLessThan(0.6);
    }
  });

  it("never leaks internals or em dashes into the user message", () => {
    const samples: Array<[string, DocumentKind]> = [
      [REAL_CV, "resume"],
      [BADLY_FORMATTED_CV, "resume"],
      [SHOPPING_LIST, "resume"],
      [LOREM_IPSUM, "resume"],
      [KEYBOARD_MASH, "resume"],
      [REPEATED_LINES, "resume"],
      [TOO_SHORT_CV, "resume"],
      [REAL_JOB_POSTING, "job-posting"],
      [SHOPPING_LIST, "job-posting"],
    ];

    for (const [text, kind] of samples) {
      const { message } = check(text, kind);
      expect(message.length).toBeGreaterThan(20);
      // The project bans long dashes in shipped strings, so assert it here
      // rather than trusting review to catch one in a copy tweak later.
      expect(message).not.toMatch(/[\u2013\u2014]/);
      expect(message).not.toMatch(/confidence|weight|signal|verdict|score of|heuristic/i);
    }
  });

  it("explains every signal it reports, present or not", () => {
    for (const entry of check(SHOPPING_LIST, "resume").signals) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.detail.length).toBeGreaterThan(10);
      expect(entry.weight).toBeGreaterThanOrEqual(0);
      expect(entry.weight).toBeLessThanOrEqual(1);
    }
  });
});
