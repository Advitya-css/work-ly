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

/** Looks like a base-form verb we can safely conjugate: a plain word, not already past, not "-ing"/"-s". */
function looksLikeBaseVerb(word: string): boolean {
  const w = word.toLowerCase();
  return /^[a-z]+$/.test(w) && !isPastTense(w) && !/ing$/.test(w) && !/[^s]s$/.test(w) && w.length > 1;
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
