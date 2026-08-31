/**
 * Is this text actually the document the user says it is?
 *
 * Everything downstream of upload (the CV parser, the job parser, the match
 * score, the pathway generator) is happy to run on any string at all. Feed it
 * a shopping list and it will produce a career profile with a number attached,
 * and the UI will present that number with exactly the same confidence it
 * gives a real CV. That is the bug this module exists to stop: not a crash, a
 * confidently wrong answer.
 *
 * The approach is deliberately boring. No model, no network, no dependency:
 * a set of surface signals that real CVs and real job ads almost always carry
 * and unrelated text almost never does, plus a few hard gates for input that
 * is not prose at all. It is a smell test, not a classifier. It will pass a
 * fictional CV, because a fictional CV looks exactly like a real one, and we
 * cannot tell the difference from text alone. What it catches is the far more
 * common case: the wrong file, a failed PDF extraction, placeholder text, or
 * someone testing what the app does with junk.
 *
 * Because it is a heuristic it has three outcomes rather than two. "warn" is
 * the important one. Real CVs come out of PDF extraction mangled all the time,
 * columns interleaved, headings stripped, and refusing those outright would be
 * worse than the bug we are fixing. Anything ambiguous gets shown to the user
 * with a caveat rather than blocked.
 *
 * Pure function by design: no I/O and no `server-only` import, so it runs in a
 * plain node test and can also be called from the client before upload.
 */

export type DocumentKind = "resume" | "job-posting";

export interface AuthenticitySignal {
  /** short machine name, e.g. "has-date-ranges" */
  id: string;
  /** true when the signal was found */
  present: boolean;
  /** human sentence describing what was or wasn't found */
  detail: string;
  /** how much this signal contributes, 0-1 */
  weight: number;
}

export interface AuthenticityResult {
  kind: DocumentKind;
  /** 0-1. How confident we are this text is genuinely the claimed kind. */
  confidence: number;
  /** "accept" | "warn" | "reject" */
  verdict: "accept" | "warn" | "reject";
  /** Plain-language sentence for the user. Never mentions internals. */
  message: string;
  signals: AuthenticitySignal[];
}

/* ------------------------------------------------------------------ */
/* Thresholds                                                          */
/* ------------------------------------------------------------------ */

/**
 * Every number here is a judgement call, so they live together where they can
 * be argued about, rather than scattered through the checks as magic numbers.
 */

/** At or above this, we treat the document as genuine and say nothing. */
const ACCEPT_AT = 0.6;

/** Below this, we refuse. Between the two, we let it through with a caveat. */
const WARN_AT = 0.35;

/**
 * A hard gate caps confidence here rather than forcing it to zero. Some of
 * the vetoed inputs really do carry a couple of genuine signals (a lorem ipsum
 * CV template still has "Experience" headings in it), and reporting 0.0 for
 * something that scored 0.5 on content would make the signal list read as a
 * contradiction to anyone debugging it.
 */
const REJECTED_CONFIDENCE_CAP = 0.2;

/**
 * Length floors. A CV shorter than this is either a fragment or a filename,
 * and 200 characters is roughly two lines of a real one, so the floor only
 * bites on input nobody could parse anyway. Job ads get a lower floor because
 * a genuinely terse ad ("Kitchen porter, 20 hours, apply in store") is a real
 * thing in a way that a five word CV is not.
 */
const MIN_RESUME_CHARS = 200;
const MIN_RESUME_TOKENS = 40;
const MIN_JOB_CHARS = 150;

/**
 * Companion token floor for job ads. Not in the original spec, but character
 * count alone is fooled by one very long unbroken string, which is exactly
 * what a mangled paste looks like.
 */
const MIN_JOB_TOKENS = 25;

/**
 * Fraction of tokens that must look like plausible words. Set at 0.5 because
 * real documents sit far above it: even a dense technical CV full of acronyms
 * and version numbers lands around 0.8, and the failure mode we are catching
 * (mashed keys, a binary file read as text, a failed OCR) lands near 0.1. The
 * wide gap is why a crude ratio is good enough here.
 */
const MIN_WORDLIKE_RATIO = 0.5;

/**
 * If one meaningful word is more than a quarter of the whole document, the
 * document is not prose. Real text is nowhere near this concentrated once
 * stopwords are excluded: the most common content word in a normal CV is
 * usually under 3%.
 */
const MAX_TOKEN_SHARE = 0.25;

/**
 * Identical repeated lines. Five is chosen to sit above legitimate repetition,
 * a CV can genuinely repeat a separator, a company name across roles, or the
 * word "Present", and below the runaway repetition of a broken export.
 */
const MAX_LINE_REPEATS = 5;

/**
 * Distinct lorem ipsum words needed to call it filler. One or two would be
 * unsafe: "sed" and "elit" appear in real text, "labore" and "magna" appear in
 * names and mottos. Three distinct hits from the classic passage in the same
 * document is not a coincidence.
 */
const MIN_LOREM_HITS = 3;

/** Non-empty lines needed before we call the text structured rather than a blob. */
const MIN_STRUCTURED_LINES = 5;

/* ------------------------------------------------------------------ */
/* Low level text inspection                                           */
/* ------------------------------------------------------------------ */

const LOREM_TOKENS = new Set([
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "eiusmod",
  "tempor",
  "incididunt",
  "labore",
  "dolore",
  "magna",
  "aliqua",
]);

/**
 * "sit" and "sed" are also ordinary English or abbreviations, so they only
 * count towards the filler verdict when they appear in their usual company.
 * Without this, a CV mentioning "SED" as a tool would collect free hits.
 */
const AMBIGUOUS_LOREM_TOKENS = new Set(["sit", "sed"]);

/** Words too common to say anything about a document's subject. */
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "has",
  "was",
  "were",
  "are",
  "you",
  "your",
  "our",
  "their",
  "will",
  "into",
  "over",
  "than",
  "then",
  "them",
  "they",
  "not",
  "but",
  "all",
  "any",
  "out",
  "who",
  "how",
  "its",
]);

const VOWELS = /[aeiouyàáâäãåèéêëìíîïòóôöõùúûüæøœ]/i;
const LETTER = /[a-zàáâäãåèéêëìíîïòóôöõùúûüæøœñçß]/i;

/** Runs of this many consonants in a row do not occur in ordinary words. */
const CONSONANT_RUN = /[bcdfghjklmnpqrstvwxz]{5,}/i;

function splitTokens(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function nonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Strips surrounding punctuation so "(engineer)," compares as "engineer". */
function bareToken(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "");
}

/**
 * Could this token plausibly be a word a human typed on purpose?
 *
 * The consonant-run rule does misfire on a handful of genuine English words,
 * "strengths" is the one that comes up in CVs, and that is fine: the caller
 * uses this as a ratio across the whole document, never as a verdict on a
 * single token. Losing one word in a hundred moves the ratio by 0.01.
 */
function looksLikeWord(raw: string): boolean {
  const token = bareToken(raw).toLowerCase();
  if (!token) return false;

  // "a" and "I" are the only one-letter words worth allowing; a lone "x" or
  // "z" is far more likely to be layout debris from a PDF.
  if (token.length === 1) return token === "a" || token === "i";
  if (token.length > 30) return false;
  if (!VOWELS.test(token)) return false;
  if (CONSONANT_RUN.test(token)) return false;

  const letters = [...token].filter((char) => LETTER.test(char)).length;
  return letters / token.length >= 0.6;
}

/** Pure numbers, money and dates: neither evidence for nor against real prose. */
function isNumericish(raw: string): boolean {
  const token = bareToken(raw);
  if (!token) return false;
  return /^[£$€]?[\d,.\-/:%]+[kmb]?$/i.test(token) && /\d/.test(token);
}

interface TextStats {
  chars: number;
  tokens: string[];
  lines: string[];
  wordlikeRatio: number;
  topTokenShare: number;
  maxLineRepeats: number;
  loremHits: number;
}

function inspect(text: string): TextStats {
  const tokens = splitTokens(text);
  const lines = nonEmptyLines(text);

  // Numbers are excluded from both sides of the ratio rather than counted as
  // junk. A CV that is 30% dates and salary figures is still perfectly
  // readable prose, and penalising it here would be measuring the wrong thing.
  let wordlike = 0;
  let junk = 0;
  const counts = new Map<string, number>();
  const loremSeen = new Set<string>();

  for (const token of tokens) {
    const bare = bareToken(token).toLowerCase();

    if (isNumericish(token)) {
      // skipped on purpose, see above
    } else if (looksLikeWord(token)) {
      wordlike += 1;
    } else {
      junk += 1;
    }

    if (bare && LOREM_TOKENS.has(bare)) loremSeen.add(bare);

    // Only content words compete for "most repeated": stopwords legitimately
    // dominate any English text and would trigger the gate on every document.
    if (bare.length >= 4 && !STOPWORDS.has(bare)) {
      counts.set(bare, (counts.get(bare) ?? 0) + 1);
    }
  }

  let topCount = 0;
  for (const count of counts.values()) {
    if (count > topCount) topCount = count;
  }

  const lineCounts = new Map<string, number>();
  for (const line of lines) {
    // Short lines repeat innocently ("---", "Present", a bullet character), so
    // only substantial lines count towards the repetition gate.
    if (line.length < 12) continue;
    const key = line.toLowerCase();
    lineCounts.set(key, (lineCounts.get(key) ?? 0) + 1);
  }
  let maxLineRepeats = 0;
  for (const count of lineCounts.values()) {
    if (count > maxLineRepeats) maxLineRepeats = count;
  }

  // "sit" and "sed" only count when the passage is already showing itself.
  const unambiguousHits = [...loremSeen].filter((token) => !AMBIGUOUS_LOREM_TOKENS.has(token));
  const loremHits = unambiguousHits.length > 0 ? loremSeen.size : 0;

  const denominator = wordlike + junk;

  return {
    chars: text.trim().length,
    tokens,
    lines,
    wordlikeRatio: denominator === 0 ? 0 : wordlike / denominator,
    topTokenShare: tokens.length === 0 ? 0 : topCount / tokens.length,
    maxLineRepeats,
    loremHits,
  };
}

/* ------------------------------------------------------------------ */
/* Content signals                                                     */
/* ------------------------------------------------------------------ */

const EMAIL = /[\w.+-]{1,64}@[\w-]{1,255}\.[\w.-]{2,24}/;
const PROFILE_URL = /(?:linkedin\.com|github\.com|gitlab\.com)\/[\w%-]+/i;

const MONTHS =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const YEAR = /\b(?:19[5-9]\d|20[0-4]\d)\b/;
const MONTH_YEAR = new RegExp(`\\b(?:${MONTHS})\\.?\\s+(?:19[5-9]\\d|20[0-4]\\d)\\b`, "i");
const OPEN_ENDED = /\b(?:present|current|ongoing|to date)\b/i;

const CV_SECTIONS =
  /^\s*(?:work\s+|professional\s+|technical\s+|key\s+|core\s+)?(?:experience|employment(?:\s+history)?|education|skills|projects?|qualifications?|certifications?|licen[cs]es?|summary|profile|objective|achievements?|awards?|publications?|references?|interests?|volunteering)\b\s*:?\s*$/i;

const EMPLOYMENT_LANGUAGE =
  /\b(?:worked|working|work(?:ed)?\s+(?:at|for)|led|leading|managed|managing|developed|developing|built|building|designed|designing|delivered|implemented|maintained|responsible\s+for|reported\s+to|promoted\s+to|graduated|intern(?:ship)?|apprentice(?:ship)?|placement|engineer|developer|analyst|manager|coordinator|consultant|assistant|administrator|technician|scientist|designer|researcher|teacher|nurse|accountant|supervisor|specialist|officer|director)\b/i;

/**
 * Phone numbers are the noisiest of the contact signals: a bare "2019 - 2023"
 * or a reference number can look like one. Requiring 9 to 15 digits, which is
 * the real world range for national plus international numbers, keeps date
 * ranges and postcodes out without needing per-country formats.
 */
function hasPhoneShapedNumber(text: string): boolean {
  const candidates = text.match(/\+?\d[\d\s().-]{7,20}\d/g);
  if (!candidates) return false;
  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, "").length;
    return digits >= 9 && digits <= 15;
  });
}

const REQUIREMENT_LANGUAGE =
  /\b(?:required|requirements?|must\s+have|you\s+will|you'?ll\s+(?:be|have|work)|responsibilities|responsible\s+for|qualifications?|we\s+are\s+looking\s+for|we'?re\s+looking\s+for|ideal\s+candidate|nice\s+to\s+have|preferred|essential|desirable|the\s+role|about\s+the\s+role|experience\s+(?:in|with|of))\b/i;

const JOB_TITLE_WORDS =
  /\b(?:engineer|developer|analyst|manager|designer|scientist|consultant|coordinator|specialist|administrator|director|architect|technician|accountant|nurse|teacher|lecturer|researcher|assistant|associate|officer|executive|intern|apprentice|supervisor|chef|driver|paralegal|recruiter|marketer|copywriter|strategist|lead)\b/i;

const EMPLOYMENT_TERMS =
  /\b(?:full[\s-]?time|part[\s-]?time|permanent|fixed[\s-]?term|contract|freelance|temporary|salary|salaried|per\s+(?:year|annum|hour)|per\s+annum|pro\s+rata|benefits|pension|holiday\s+allowance|remote|hybrid|on[\s-]?site|onsite|shift)\b/i;

/**
 * The range separator is written as an escape rather than a literal because
 * this codebase bans long dashes in source, and real adverts use one in
 * "£68,000 to £82,000" more often than a plain hyphen.
 */
const PAY_FIGURE = /[£$€]\s?\d[\d,.]*\s*(?:k\b|000|per|a\s+year|-|\u2013|to\b)?/i;

const COMPANY_OR_APPLY =
  /\b(?:apply|application|applications|join\s+(?:us|our|the\s+team)|our\s+team|about\s+us|about\s+the\s+company|we'?re\s+hiring|we\s+are\s+hiring|our\s+company|careers?\s+(?:page|site)|equal\s+opportunit(?:y|ies)|recruit(?:er|ment)|hiring\s+manager|closing\s+date)\b/i;

/* ------------------------------------------------------------------ */
/* Signal scoring                                                      */
/* ------------------------------------------------------------------ */

/**
 * Weights sum to 1 per kind. They are not measured, they are ranked: signals
 * that are hard to have by accident (dates on a CV, requirement language in an
 * ad) carry more than signals that any text might trip (multi-line layout).
 *
 * The layout signal is deliberately the smallest at 0.12. It is worth keeping,
 * a single unbroken blob is a real symptom of bad extraction, but it is also
 * the one signal a shopping list passes for free, and it must never be able to
 * drag junk anywhere near the warn line on its own.
 */

/** Missing-signal wording, phrased the way a user would describe the thing. */
const MISSING_LABELS: Record<string, string> = {
  "has-date-ranges": "dates",
  "has-contact-details": "contact details",
  "has-cv-sections": "any recognisable sections",
  "has-employment-language": "any description of work you have done",
  "has-multi-line-structure": "the layout of a document",
  "has-requirement-language": "requirements or responsibilities",
  "has-role-title": "a job title",
  "has-employment-terms": "details like contract type, location or pay",
  "has-company-or-application": "anything about the employer or how to apply",
};

function resumeSignals(text: string, stats: TextStats): AuthenticitySignal[] {
  const hasDates = YEAR.test(text) || MONTH_YEAR.test(text) || OPEN_ENDED.test(text);
  const hasContact = EMAIL.test(text) || PROFILE_URL.test(text) || hasPhoneShapedNumber(text);
  const sectionHits = stats.lines.filter((line) => CV_SECTIONS.test(line)).length;
  const hasEmploymentLanguage = EMPLOYMENT_LANGUAGE.test(text);
  const structured = stats.lines.length >= MIN_STRUCTURED_LINES;

  return [
    {
      id: "has-date-ranges",
      present: hasDates,
      weight: 0.24,
      detail: hasDates
        ? "Found years or date ranges, which is how a CV shows a timeline."
        : "No years or date ranges, so there is no timeline to read.",
    },
    {
      id: "has-contact-details",
      present: hasContact,
      weight: 0.22,
      detail: hasContact
        ? "Found contact details such as an email address, phone number or profile link."
        : "No email address, phone number or profile link.",
    },
    {
      id: "has-cv-sections",
      present: sectionHits > 0,
      weight: 0.24,
      detail:
        sectionHits > 0
          ? `Found ${sectionHits} standard CV heading${sectionHits === 1 ? "" : "s"}, for example Experience or Education.`
          : "No standard CV headings such as Experience, Education or Skills.",
    },
    {
      id: "has-employment-language",
      present: hasEmploymentLanguage,
      weight: 0.18,
      detail: hasEmploymentLanguage
        ? "Found the language of work: job titles or descriptions of what was done in a role."
        : "Nothing describing a role, a job title or work that was done.",
    },
    {
      id: "has-multi-line-structure",
      present: structured,
      weight: 0.12,
      detail: structured
        ? `Laid out over ${stats.lines.length} lines rather than one block of text.`
        : "The text is one block rather than a laid out document.",
    },
  ];
}

function jobSignals(text: string, stats: TextStats): AuthenticitySignal[] {
  const hasRequirements = REQUIREMENT_LANGUAGE.test(text);

  // A title line is a short line, not a sentence containing a title word. The
  // length cap is what separates "Senior Data Analyst" from a paragraph that
  // happens to mention an analyst.
  const hasTitleLine = stats.lines.some((line) => line.length <= 90 && JOB_TITLE_WORDS.test(line));

  const hasTerms = EMPLOYMENT_TERMS.test(text) || PAY_FIGURE.test(text);
  const hasCompany = COMPANY_OR_APPLY.test(text);
  const structured = stats.lines.length >= MIN_STRUCTURED_LINES;

  return [
    {
      id: "has-requirement-language",
      present: hasRequirements,
      weight: 0.3,
      detail: hasRequirements
        ? "Found requirement or responsibility language, which every real advert has."
        : "Nothing describing requirements, responsibilities or who the employer is looking for.",
    },
    {
      id: "has-employment-terms",
      present: hasTerms,
      weight: 0.22,
      detail: hasTerms
        ? "Found employment details such as contract type, working pattern or pay."
        : "No contract type, working pattern, location or pay.",
    },
    {
      id: "has-company-or-application",
      present: hasCompany,
      weight: 0.2,
      detail: hasCompany
        ? "Found something about the employer or how to apply."
        : "Nothing about the employer or how to apply.",
    },
    {
      id: "has-role-title",
      present: hasTitleLine,
      weight: 0.16,
      detail: hasTitleLine
        ? "Found a line that reads like a job title."
        : "No line that reads like a job title.",
    },
    {
      id: "has-multi-line-structure",
      present: structured,
      weight: 0.12,
      detail: structured
        ? `Laid out over ${stats.lines.length} lines rather than one block of text.`
        : "The text is one block rather than a laid out advert.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Hard gates                                                          */
/* ------------------------------------------------------------------ */

interface Gate {
  /** Signal id, phrased positively so that `present: false` always means trouble. */
  id: string;
  detail: string;
  message: string;
}

const KIND_NOUN: Record<DocumentKind, string> = {
  resume: "CV",
  "job-posting": "job description",
};

/**
 * Gates veto rather than contribute, so they carry weight 0 and sit outside
 * the weighted sum. Keeping them in the signals list anyway means one place to
 * look when a user asks why their upload was refused.
 */
function findGate(text: string, kind: DocumentKind, stats: TextStats): Gate | null {
  const noun = KIND_NOUN[kind];

  const tooShort =
    kind === "resume"
      ? stats.chars < MIN_RESUME_CHARS || stats.tokens.length < MIN_RESUME_TOKENS
      : stats.chars < MIN_JOB_CHARS || stats.tokens.length < MIN_JOB_TOKENS;

  if (tooShort) {
    return {
      id: "enough-text-to-read",
      detail: `Only ${stats.chars} characters and ${stats.tokens.length} words, which is too little to judge.`,
      message:
        kind === "resume"
          ? "There isn't enough text here to work with. If you pasted an extract, paste the whole CV, and if you uploaded a file, check the text came through rather than an image or a blank page."
          : "There isn't enough text here to work with. Paste the full job description, including the requirements and responsibilities.",
    };
  }

  if (stats.loremHits >= MIN_LOREM_HITS) {
    return {
      id: "not-placeholder-text",
      detail: `Contains ${stats.loremHits} words from the standard lorem ipsum placeholder passage.`,
      message: `This is placeholder text rather than a real ${noun}. Anything Work-ly built from it would be made up, so nothing has been saved.`,
    };
  }

  if (stats.wordlikeRatio < MIN_WORDLIKE_RATIO) {
    return {
      id: "readable-words",
      detail: `Only ${Math.round(stats.wordlikeRatio * 100)}% of the text reads as real words.`,
      message: `Work-ly couldn't find readable words in this. If you uploaded a file, it may be a scan or use fonts that don't copy properly: try opening it, selecting all the text and pasting it in instead.`,
    };
  }

  if (stats.topTokenShare > MAX_TOKEN_SHARE) {
    return {
      id: "varied-wording",
      detail: `One word makes up ${Math.round(stats.topTokenShare * 100)}% of the text.`,
      message: `Almost all of this is the same word repeated, so there is no ${noun} here to read. If the file looked fine when you opened it, the conversion has gone wrong: try re-saving it as a PDF.`,
    };
  }

  if (stats.maxLineRepeats > MAX_LINE_REPEATS) {
    return {
      id: "varied-lines",
      detail: `The same line appears ${stats.maxLineRepeats} times.`,
      message: `The same line repeats over and over in this file, which usually means it didn't convert properly. Try re-saving it as a PDF and uploading again.`,
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

/** "dates, contact details or any recognisable sections" */
function listMissing(signals: AuthenticitySignal[]): string {
  const labels = signals
    .filter((signal) => !signal.present)
    .map((signal) => MISSING_LABELS[signal.id])
    .filter((label): label is string => Boolean(label))
    .slice(0, 3);

  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

/**
 * User-facing copy. Two rules: never name a signal, a weight or a score, and
 * always end with the thing the user can actually do next. A message that only
 * says "this failed" turns a recoverable mistake into a dead end.
 */
function buildMessage(
  kind: DocumentKind,
  verdict: AuthenticityResult["verdict"],
  signals: AuthenticitySignal[],
): string {
  const noun = KIND_NOUN[kind];
  const missing = listMissing(signals);

  if (verdict === "accept") {
    return kind === "resume"
      ? "This looks like a CV. Work-ly will use it to build your profile, so check the parsed details before you rely on them."
      : "This looks like a job description. Work-ly will use it to compare against your profile.";
  }

  if (verdict === "warn") {
    return kind === "resume"
      ? "This might not be a CV, or it might be formatted in a way Work-ly can't read well. Check the parsed details carefully before relying on any scores."
      : "This might not be a job description, or it might be formatted in a way Work-ly can't read well. Check the parsed details carefully before relying on any match score.";
  }

  const found = missing ? ` Work-ly couldn't find ${missing} in it.` : "";
  return kind === "resume"
    ? `This doesn't look like a ${noun}.${found} Upload the document you'd actually send to an employer.`
    : `This doesn't look like a ${noun}.${found} Paste the job description as it appears on the employer's site, including the requirements.`;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Scores `text` as the claimed `kind` and returns a verdict plus the reasoning
 * behind it. Never throws: any input, including an empty string, produces a
 * result, because the callers of this are upload and paste handlers where an
 * exception would be a worse experience than a refusal.
 */
// A real resume or job posting is never anywhere near this long; capping
// input before any of the regex-heavy signal detection below runs bounds
// the worst-case work per call regardless of how any individual pattern
// behaves on pathological input - the cheapest, most robust ReDoS defense
// available here, and one that holds even if a future edit reintroduces an
// unbounded quantifier somewhere in this file.
const MAX_AUTHENTICITY_CHARS = 30_000;

export function checkAuthenticity(text: string, kind: DocumentKind): AuthenticityResult {
  const safe = typeof text === "string" ? text.slice(0, MAX_AUTHENTICITY_CHARS) : "";
  const stats = inspect(safe);
  const signals = kind === "resume" ? resumeSignals(safe, stats) : jobSignals(safe, stats);

  const score = signals.reduce((total, signal) => total + (signal.present ? signal.weight : 0), 0);

  const gate = findGate(safe, kind, stats);
  if (gate) {
    const gateSignal: AuthenticitySignal = {
      id: gate.id,
      present: false,
      detail: gate.detail,
      weight: 0,
    };
    return {
      kind,
      confidence: round2(Math.min(REJECTED_CONFIDENCE_CAP, score)),
      verdict: "reject",
      message: gate.message,
      signals: [gateSignal, ...signals],
    };
  }

  const confidence = round2(score);
  const verdict: AuthenticityResult["verdict"] =
    confidence >= ACCEPT_AT ? "accept" : confidence >= WARN_AT ? "warn" : "reject";

  return {
    kind,
    confidence,
    verdict,
    message: buildMessage(kind, verdict, signals),
    signals,
  };
}
