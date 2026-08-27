/**
 * WORK-HOUR LIMITS FOR STUDENT JOBS.
 *
 * Three rules govern everything in this file.
 *
 * 1. NOTHING HERE IS INVENTED. Every limit below was read off an official
 *    government page, and each carries the URL it came from so the reader
 *    can check it. Where an official source did not state a figure, this
 *    file says so and links out rather than filling the gap with a number
 *    that sounds right. A wrong hour limit could cost someone their visa,
 *    which is not a place to guess.
 *
 * 2. WORKLY NEVER ASKS YOUR IMMIGRATION STATUS. These notes are attached
 *    to the KIND OF JOB, not to the person looking at it: "on-campus roles
 *    are capped at 20 hours a week during term for students on an F-1
 *    visa" is a fact about the job, true whether or not the reader is on
 *    an F-1. Asking someone to declare a visa status, and storing it, is
 *    not something this product needs in order to be useful.
 *
 * 3. THIS IS NOT LEGAL ADVICE, and it says so on screen. Every note ends
 *    by pointing at the one person who can actually answer for an
 *    individual case: their school's international student office, or the
 *    designated school official who has to authorize the work anyway.
 *
 * Rules are national, which is why `country` gates all of this. Without
 * knowing the country there is no honest limit to display, so the UI shows
 * a prompt to pick one instead of defaulting to the United States.
 */

export type StudentJobKind = "on-campus" | "off-campus" | "internship";

export interface LegalLimit {
  /** Short label shown on the job itself. */
  headline: string;
  /** The detail, in plain language. */
  detail: string;
  /** Who actually authorizes or confirms this for an individual. */
  confirmWith: string;
  sourceName: string;
  sourceUrl: string;
}

export interface CountryRules {
  code: string;
  label: string;
  /** Set when this country's rules could not be sourced. */
  unverified?: boolean;
  limits: Record<StudentJobKind, LegalLimit[]>;
}

const UNITED_STATES: CountryRules = {
  code: "US",
  label: "United States",
  limits: {
    "on-campus": [
      {
        headline: "20 hours a week while classes are in session",
        detail:
          "Students on an F-1 visa may work on campus up to 20 hours per week while school is in session, and full-time during official breaks. Permission is automatic in the sense that no separate application to USCIS is needed, but the school still has to confirm the role qualifies as on-campus employment.",
        confirmWith: "Your designated school official (DSO), before you start.",
        sourceName: "ICE, Student and Exchange Visitor Program: Employment",
        sourceUrl: "https://www.ice.gov/sevis/employment",
      },
    ],
    "off-campus": [
      {
        headline: "Needs authorization before you start",
        detail:
          "Off-campus work by an F-1 student has to be authorized by USCIS, which issues an Employment Authorization Document. The routes that exist are severe economic hardship and emergent circumstances, and both are applications with their own criteria, not something a job offer alone unlocks.",
        confirmWith:
          "Your international student office. Starting off-campus work without the authorization already in hand puts your status at risk.",
        sourceName: "Study in the States, Student Employment Overview",
        sourceUrl:
          "https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/student-employment-overview",
      },
    ],
    internship: [
      {
        headline: "CPT: must relate to your major and be part of the curriculum",
        detail:
          "Curricular Practical Training covers training that relates directly to your major and is an integral part of your school's established curriculum. You generally need to have been enrolled full-time for a full academic year first, with exceptions for some graduate programs. Your DSO authorizes it in SEVIS and it appears on your Form I-20. Over 20 hours a week counts as full-time CPT; 20 or less is part-time.",
        confirmWith: "Your DSO, who has to authorize it before the internship starts.",
        sourceName: "Study in the States, F-1 Curricular Practical Training (CPT)",
        sourceUrl:
          "https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-curricular-practical-training-cpt",
      },
      {
        headline: "A full year of full-time CPT costs you OPT",
        detail:
          "One year of full-time CPT eliminates eligibility for Optional Practical Training. Since OPT is usually how graduates work in the US after finishing, a long full-time internship can be an expensive trade. Worth raising with your adviser before accepting one.",
        confirmWith: "Your DSO, who can tell you how much CPT you have already used.",
        sourceName: "Study in the States, F-1 Curricular Practical Training (CPT)",
        sourceUrl:
          "https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-curricular-practical-training-cpt",
      },
      {
        headline: "Pre-completion OPT is the other route",
        detail:
          "Optional Practical Training can be used before you finish your program: part-time while school is in session, full-time during breaks. Twelve months is available per higher education level, and STEM fields may qualify for a further 24-month extension. Your DSO recommends it in SEVIS, but you apply to USCIS yourself for the work permit.",
        confirmWith: "Your DSO, then USCIS. Apply well ahead, since the permit has to be approved first.",
        sourceName: "Study in the States, F-1 Optional Practical Training (OPT)",
        sourceUrl:
          "https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt",
      },
    ],
  },
};

/**
 * The UK entry deliberately states no hour figure.
 *
 * The widely repeated numbers (20 hours a week in term time at degree
 * level, 10 below it) were not confirmable from an official GOV.UK page
 * when this was written: the Student visa work page describes that the
 * allowance depends on course level and on term versus vacation, but does
 * not print the figures on that page. Repeating a number from a
 * second-hand source and attributing it to GOV.UK would be exactly the
 * kind of invented fact this product refuses to produce elsewhere, so it
 * links out instead and is marked unverified so the UI can say why.
 */
const UNITED_KINGDOM: CountryRules = {
  code: "GB",
  label: "United Kingdom",
  unverified: true,
  limits: {
    "on-campus": [
      {
        headline: "Depends on your course level and the time of year",
        detail:
          "On a Student visa, how much you can work depends on what you are studying and whether it is term time or vacation. GOV.UK sets out the allowance but does not print the weekly figure on its overview page, so Workly does not state one here rather than repeat a number it cannot cite.",
        confirmWith:
          "Your visa conditions, printed on your BRP or in your online status, and your university's international student advice team.",
        sourceName: "GOV.UK, Student visa: what you can and cannot do",
        sourceUrl: "https://www.gov.uk/student-visa/work",
      },
    ],
    "off-campus": [
      {
        headline: "Same allowance, and some work is barred outright",
        detail:
          "The weekly allowance applies to any employment, on campus or off. Separately, a Student visa does not permit self-employment, or work as a professional sportsperson or sports coach, regardless of hours.",
        confirmWith: "Your university's international student advice team.",
        sourceName: "GOV.UK, Student visa: what you can and cannot do",
        sourceUrl: "https://www.gov.uk/student-visa/work",
      },
    ],
    internship: [
      {
        headline: "Counts toward your weekly limit unless it is a required placement",
        detail:
          "A paid internship is work and counts against your allowance. Placements that are a required, assessed part of your course are treated differently. Which one yours is depends on how your course is structured, so it is worth confirming before you accept.",
        confirmWith: "Your course leader and your international student advice team.",
        sourceName: "GOV.UK, Student visa: what you can and cannot do",
        sourceUrl: "https://www.gov.uk/student-visa/work",
      },
    ],
  },
};


const CANADA: CountryRules = {
  code: "CA",
  label: "Canada",
  unverified: false,
  limits: {
    "on-campus": [
      {
        headline: "No hour limits on campus",
        detail:
          "You can work on your school's campus without a work permit and without a restriction on hours, provided you are a full-time student and have a valid study permit. However, your specific institution may have its own policies restricting hours.",
        confirmWith: "Your institution's student employment office for internal policies.",
        sourceName: "IRCC, Work on campus",
        sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-on-campus.html",
      }
    ],
    "off-campus": [
      {
        headline: "Up to 24 hours per week off-campus during terms",
        detail:
          "As of late 2024, the limit for off-campus work during regular academic sessions is 24 hours per week. During scheduled breaks (like summer or winter holidays), you can work full-time.",
        confirmWith: "Your study permit conditions.",
        sourceName: "IRCC, Work off campus as an international student",
        sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html",
      }
    ],
    internship: [
      {
        headline: "Requires a Co-op Work Permit",
        detail:
          "If your internship or work placement is an essential part of your study program, you must apply for a co-op or intern work permit. You cannot use your standard off-campus work hours for a required co-op placement.",
        confirmWith: "Your international student advisor and IRCC.",
        sourceName: "IRCC, Co-op and internship programs",
        sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/intern.html",
      }
    ]
  }
};

const AUSTRALIA: CountryRules = {
  code: "AU",
  label: "Australia",
  unverified: false,
  limits: {
    "on-campus": [
      {
        headline: "Included in your 48-hour fortnightly limit",
        detail:
          "Unlike some countries, Australia does not distinguish between on-campus and off-campus work for hour limits. Both count towards your limit of 48 hours per fortnight during study sessions.",
        confirmWith: "The Department of Home Affairs.",
        sourceName: "Department of Home Affairs, Work restrictions",
        sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/temporary-relaxation-of-working-hours-for-student-visa-holders",
      }
    ],
    "off-campus": [
      {
        headline: "Up to 48 hours per fortnight during term",
        detail:
          "You can work up to 48 hours every 2 weeks (a fortnight) while your course is in session. During recognised school holidays and breaks, there are no restrictions on the number of hours you can work.",
        confirmWith: "The Department of Home Affairs.",
        sourceName: "Department of Home Affairs, Work restrictions",
        sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/temporary-relaxation-of-working-hours-for-student-visa-holders",
      }
    ],
    internship: [
      {
        headline: "Registered course requirements don't count towards the limit",
        detail:
          "If an internship or work placement is a registered, mandatory part of your course, the hours do not count towards your 48-hour fortnightly limit.",
        confirmWith: "Your course coordinator.",
        sourceName: "Department of Home Affairs, Work restrictions",
        sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/temporary-relaxation-of-working-hours-for-student-visa-holders",
      }
    ]
  }
};

export const COUNTRY_RULES: CountryRules[] = [UNITED_STATES, UNITED_KINGDOM, CANADA, AUSTRALIA];

export function rulesForCountry(code: string | null): CountryRules | null {
  if (!code) return null;
  return COUNTRY_RULES.find((c) => c.code === code) ?? null;
}

export function limitsFor(code: string | null, kind: StudentJobKind): LegalLimit[] {
  return rulesForCountry(code)?.limits[kind] ?? [];
}

/** Shown wherever a limit is displayed. Workly is not a law firm and says so. */
export const LEGAL_DISCLAIMER =
  "These are general rules for the country you selected, not advice about your situation. Workly does not know your immigration status and never asks for it. Confirm anything that affects your visa with your school before you accept work.";

const UNIVERSITY_ALIASES: Record<string, string[]> = {
  "nyu": ["new york university"],
  "uw": ["university of washington"],
  "uoft": ["university of toronto"],
  "uwaterloo": ["university of waterloo"],
  "waterloo": ["university of waterloo"],
  "ubc": ["university of british columbia"],
  "mcgill": ["mcgill university"],
  "usyd": ["university of sydney"],
  "unsw": ["university of new south wales"],
  "unimelb": ["university of melbourne"],
  "ucl": ["university college london"],
  "lse": ["london school of economics"],
  "mit": ["massachusetts institute of technology"],
  "ucla": ["university of california los angeles"],
  "berkeley": ["university of california berkeley", "uc berkeley"],
};

const UNIVERSITY_LOCATIONS: Record<string, string[]> = {
  "new york university": ["new york", "ny", "nyc", "manhattan", "brooklyn"],
  "columbia university": ["new york", "ny", "nyc", "manhattan"],
  "university of washington": ["seattle", "wa", "washington", "bellevue", "redmond"],
  "university of toronto": ["toronto", "on", "ontario", "gta", "mississauga"],
  "university of waterloo": ["waterloo", "on", "ontario", "kitchener", "cambridge"],
  "university of british columbia": ["vancouver", "bc", "british columbia", "burnaby"],
  "mcgill university": ["montreal", "qc", "quebec"],
  "university of sydney": ["sydney", "nsw", "new south wales"],
  "university of new south wales": ["sydney", "nsw", "new south wales"],
  "university of melbourne": ["melbourne", "vic", "victoria"],
  "university college london": ["london", "uk", "united kingdom"],
  "imperial college london": ["london", "uk", "united kingdom"],
  "london school of economics": ["london", "uk", "united kingdom"],
  "massachusetts institute of technology": ["boston", "cambridge", "ma", "massachusetts"],
  "harvard university": ["boston", "cambridge", "ma", "massachusetts"],
  "stanford university": ["stanford", "palo alto", "san francisco", "ca", "california", "bay area"],
  "university of california berkeley": ["berkeley", "san francisco", "ca", "california", "bay area"],
  "university of california los angeles": ["los angeles", "la", "ca", "california", "santa monica"],
};

export function classifyStudentJob(input: {
  title: string | null;
  company: string | null;
  employmentType: string | null;
  description: string | null;
  location: string | null;
  university: string | null;
}): StudentJobKind | "wrong-location" {
  let university = (input.university ?? "").toLowerCase().trim();
  
  if (UNIVERSITY_ALIASES[university]) {
    university = UNIVERSITY_ALIASES[university][0];
  } else {
    // Check if the user typed something that is an alias value (e.g. "uc berkeley")
    for (const aliases of Object.values(UNIVERSITY_ALIASES)) {
      if (aliases.includes(university)) {
        university = aliases[0]; // standardize to the primary name
        break;
      }
    }
  }

  let kind: StudentJobKind = "off-campus";

  if (input.employmentType === "INTERNSHIP") kind = "internship";
  else {
    const title = (input.title ?? "").toLowerCase();
    if (/\bintern(ship)?\b/.test(title)) kind = "internship";
    else {
      const company = (input.company ?? "").toLowerCase();

      if (university && company.includes(university)) kind = "on-campus";
      else {
        const campusEmployer =
          /\b(university|college|campus|student union|students' union|dining services|residence life|library)\b/;
        if (campusEmployer.test(company)) kind = "on-campus";
        else {
          const campusTitle = /\b(student (assistant|worker|ambassador)|resident (adviser|advisor|assistant)|teaching assistant|research assistant|work[\s-]?study)\b/;
          if (campusTitle.test(title)) kind = "on-campus";
        }
      }
    }
  }

  // Enforce location matching across ALL jobs if we know the university's location.
  // This prevents jobs at OTHER universities (which might mistakenly be tagged as on-campus 
  // because the employer name contains the word 'university') from bypassing the location check.
  if (input.location && university) {
    const validLocations = UNIVERSITY_LOCATIONS[university];
    if (validLocations) {
      const loc = input.location.toLowerCase();
      const isMatch = validLocations.some(v => {
        const regex = new RegExp(`\\b${v}\\b`, "i");
        return regex.test(loc);
      });
      if (!isMatch) {
        return "wrong-location";
      }
    }
  }

  return kind;
}