/**
 * Light defense against a resume or job posting trying to talk to the model
 * instead of just being text for it to extract from.
 *
 * The real safety net here is structural, not this file: extraction goes
 * through a constrained JSON schema, and everything the model returns is
 * grounded against the source text afterward (lib/ai/grounding.ts) and
 * dropped if it isn't actually present there. An injected instruction can't
 * make the model invent a field the schema doesn't have, and even if it
 * changed a value's wording, that value still has to trace back to the
 * source text to survive grounding.
 *
 * This module is the second, smaller layer on top of that: it neutralizes
 * the specific surface shapes an injection attempt would need - a line that
 * looks like a role marker a chat API would otherwise interpret specially,
 * or a stock "ignore your instructions" phrase - before the text reaches
 * the prompt at all. It is deliberately narrow. A resume that happens to
 * mention "Systems Administrator" or a job posting titled "System Design
 * Lead" must read untouched; only markers that struct a genuine attempt to
 * open a new turn or override the system prompt are touched.
 *
 * Pure function, no I/O: swap in a more thorough classifier here later
 * without touching either caller.
 */

const ROLE_MARKER = /^\s*(system|assistant|developer)\s*:\s*$/gim;

const CHAT_TEMPLATE_TOKENS = /<\|(?:im_start|im_end|system|assistant|user)\|>|\[\/?(?:INST|SYS)\]/gi;

const OVERRIDE_PHRASES =
  /\b(?:ignore|disregard|forget)\s+(?:all\s+|any\s+)?(?:the\s+|your\s+|previous\s+|prior\s+|above\s+)*instructions?\b|\byou\s+are\s+now\s+(?:a|an)\b|\bnew\s+instructions?\s*:/gi;

/**
 * This runs ONLY on the copy of the text sent to the model - never on the
 * copy grounding compares extracted claims against (job.rawInput / the
 * original resume text, kept and passed separately by both callers) - so
 * there's no need to preserve length or offsets here. A plain, fixed
 * placeholder is enough.
 */
export function stripPromptInjectionMarkers(text: string): string {
  return text
    .replace(ROLE_MARKER, "[removed]")
    .replace(CHAT_TEMPLATE_TOKENS, "[removed]")
    .replace(OVERRIDE_PHRASES, "[removed]");
}
