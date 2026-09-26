/**
 * Keeps a rewritten resume bullet in the same tense as the line it came
 * from.
 *
 * The model is told to lead with a past-tense verb, but it regularly
 * answers "Built 40+ dbt models" with "Build 40+ dbt models", and past
 * roles came back as "Deliver Power BI dashboards" - which reads like a
 * job description, not something the candidate did. When the source line
 * is past tense and the rewrite leads with a base-form verb, this converts
 * that verb (and a second one joined by "and": "Design and analyze") to the
 * past. Pure and deterministic.
 */

const IRREGULAR: Record<string, string> = {
  build: "built", buy: "bought", bring: "brought", catch: "caught", choose: "chose", cut: "cut", deal: "dealt",
  do: "did", draw: "drew", drive: "drove", feed: "fed", find: "found", get: "got", give: "gave", go: "went",
  grow: "grew", hold: "held", keep: "kept", lay: "laid", lead: "led", leave: "left", lend: "lent", make: "made",
  meet: "met", pay: "paid", put: "put", read: "read", ride: "rode", rebuild: "rebuilt", rewrite: "rewrote",
  run: "ran", sell: "sold", send: "sent", set: "set", shape: "shaped", shut: "shut", speak: "spoke",
  spend: "spent", split: "split", spread: "spread", stand: "stood", take: "took", teach: "taught", tell: "told",
  think: "thought", undertake: "undertook", win: "won", write: "wrote", co: "co",
  oversee: "oversaw", overcome: "overcame", withdraw: "withdrew", understand: "understood", upset: "upset",
};

const PAST_IRREGULAR = new Set(Object.values(IRREGULAR));

/** Verbs whose final consonant doubles in the past tense. */
const DOUBLING = new Set(["plan", "ship", "scrap", "drop", "stop", "step", "map", "chip", "tap", "trim", "commit", "control", "equip", "admit", "prefer", "refer", "transfer", "occur", "program"]);

export function isPastTense(word: string): boolean {
  const w = word.toLowerCase();
  return /[a-z]ed$/.test(w) || PAST_IRREGULAR.has(w);
}

export function toPast(verb: string): string {
  const lower = verb.toLowerCase();
  let past: string;
  if (IRREGULAR[lower]) past = IRREGULAR[lower];
  else if (isPastTense(lower)) return verb;
  else if (/e$/.test(lower)) past = `${lower}d`;
  else if (/[^aeiou]y$/.test(lower)) past = `${lower.slice(0, -1)}ied`;
  else if (DOUBLING.has(lower)) past = `${lower}${lower.slice(-1)}ed`;
  else past = `${lower}ed`;
  return verb[0] === verb[0].toUpperCase() ? past[0].toUpperCase() + past.slice(1) : past;
}

/**
 * Resume action verbs we'll conjugate. Only these: a rewrite that leads
 * with a tool or skill ("BigQuery and dbt: built...", "Tableau dashboards")
 * must never be "conjugated" into "Bigqueried and dbted".
 */
const ACTION_VERBS = new Set(
  `achieve adapt administer advise align analyse analyze architect assemble assess audit automate balance boost build
  calculate champion clean coach collaborate collect communicate compile complete conduct configure consolidate construct
  consult coordinate create cut debug decrease define deliver deploy design detect develop devise diagnose direct document
  draft drive enable engineer enhance establish estimate evaluate execute expand expedite extract facilitate forecast
  generate guide handle identify implement improve increase influence initiate innovate inspect install integrate interpret
  introduce investigate launch lead maintain manage map measure mentor migrate model modernize monitor negotiate optimize
  orchestrate organize oversee own partner pilot plan predict prepare present prioritize process produce program project
  propose prototype provide publish recommend reconcile redesign reduce refactor refine report research resolve restructure
  review revamp run scale schedule secure segment select ship simplify solve spearhead standardize streamline strengthen
  structure supervise support survey synthesize test track train transform translate troubleshoot unify update upgrade
  validate visualize write`.split(/\s+/),
);

/** A base-form resume verb we can safely conjugate. */
function looksLikeBaseVerb(word: string): boolean {
  return ACTION_VERBS.has(word.toLowerCase());
}

function firstWord(text: string): string {
  return text.trim().replace(/^[\s•\-*]+/, "").split(/\s+/)[0]?.replace(/[^A-Za-z]/g, "") ?? "";
}

export function matchSourceTense(rewrite: string, source: string): string {
  const src = firstWord(source);
  if (!src || !isPastTense(src)) return rewrite;
  const lead = rewrite.match(/^(\s*[•\-*]?\s*)([A-Za-z]+)(\s+and\s+)([A-Za-z]+)?/);
  const single = rewrite.match(/^(\s*[•\-*]?\s*)([A-Za-z]+)/);
  if (!single || !looksLikeBaseVerb(single[2])) return rewrite;
  if (lead && lead[4] && looksLikeBaseVerb(lead[4]) && /\s+and\s+/.test(lead[3])) {
    return `${lead[1]}${toPast(lead[2])}${lead[3]}${toPast(lead[4])}${rewrite.slice(lead[0].length)}`;
  }
  return `${single[1]}${toPast(single[2])}${rewrite.slice(single[0].length)}`;
}

/** Tool and product names in a line (capitalised or with digits/symbols), minus its first word. */
function namedTerms(text: string): string[] {
  const words = text.trim().split(/\s+/).slice(1);
  return words
    .map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#]+$/g, ""))
    .filter((w) => w.length > 1 && (/[A-Z]/.test(w) || /\d/.test(w)));
}

/**
 * The guard every AI resume rewrite passes through before a user sees it.
 * Falls back to the user's own line when the rewrite
 *  - drops a tool, product or number the line named ("Power BI and for 3
 *    clients", "moving Excel workflows to scheduled."), or
 *  - is a "Keyword: rest of line" fragment rather than a sentence.
 * Otherwise it only fixes the tense.
 */
export function safeRewrite(rewrite: string, source: string): string {
  const r = rewrite.trim();
  if (!r) return source;
  if (/^[^.:]{1,40}:\s/.test(r)) return source;
  const lower = r.toLowerCase();
  if (namedTerms(source).some((t) => !lower.includes(t.toLowerCase()))) return source;
  return matchSourceTense(r, source);
}
