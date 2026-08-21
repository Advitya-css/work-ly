import { createHash } from "crypto";

/**
 * EMBEDDINGS
 *
 * ==========================================================================
 * BE CLEAR ABOUT WHAT THIS IS
 * ==========================================================================
 * The default provider here is a hashed bag-of-words vector, not a learned
 * semantic embedding. It captures lexical overlap - two texts using the
 * same words score highly - and it does NOT know that "Story Producer" is
 * related to "Documentary Producer" unless they happen to share words.
 *
 * That limitation is why hidden role discovery is built on an explicit
 * role graph (role-graph.ts) rather than on vector similarity, and why the
 * search engine blends four signals instead of trusting one. The Phase 8
 * spec's instruction not to rely exclusively on embeddings is right on the
 * merits, and doubly right given what the default provider actually is.
 *
 * Why ship this rather than require an embedding API:
 *   - It works with no key, offline, in under a millisecond.
 *   - It's deterministic, so stored vectors stay valid across restarts and
 *     results are reproducible.
 *   - It's genuinely useful for what it's used for here: near-duplicate
 *     detection and "more like this" ranking, both of which are largely
 *     lexical problems.
 *
 * When a real embedding model is configured, `embeddingProvider` swaps to
 * it and stored vectors are re-generated (the model name is recorded on
 * every row precisely so a mismatch is detectable).
 */

export const EMBEDDING_DIMENSIONS = 256;

export interface EmbeddingProvider {
  readonly name: string;
  /** True for providers that need no network call, so they're safe to run inline. */
  readonly isLocal: boolean;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "will", "have", "has", "this", "that",
  "from", "they", "their", "them", "not", "but", "all", "can", "who", "how", "why", "what", "when",
  "job", "role", "work", "working", "team", "teams", "company", "including", "across", "within",
  "about", "into", "over", "such", "also", "more", "most", "some", "any", "per", "via",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#.]/gu, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^[.]+|[.]+$/g, ""))
    .filter((token) => token.length > 2 && token.length < 40 && !STOPWORDS.has(token));
}

/** Stable token → dimension mapping. Hashing keeps the vector fixed-width without a learned vocabulary. */
function dimensionFor(token: string): number {
  const digest = createHash("md5").update(token).digest();
  return digest.readUInt32BE(0) % EMBEDDING_DIMENSIONS;
}

/** Sign hashing - spreads collisions in both directions so they partially cancel rather than always accumulating. */
function signFor(token: string): number {
  const digest = createHash("md5").update(`sign:${token}`).digest();
  return digest[0] % 2 === 0 ? 1 : -1;
}

export function localEmbed(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vector;

  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);

  for (const [token, count] of counts) {
    // Sublinear term frequency: a word appearing 20 times shouldn't
    // dominate one appearing twice, which matters a lot for job posts that
    // repeat the company name throughout.
    const weight = 1 + Math.log(count);
    vector[dimensionFor(token)] += weight * signFor(token);
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

export const localEmbeddingProvider: EmbeddingProvider = {
  name: "local-hashed-bow-v1",
  isLocal: true,
  async embed(text: string) {
    return localEmbed(text);
  },
  async embedBatch(texts: string[]) {
    return texts.map(localEmbed);
  },
};

/**
 * Resolves the active provider. Only the local one exists today; the seam
 * is here so adding a real model is a one-file change and every call site
 * already stores the model name alongside the vector.
 */
function resolveProvider(): EmbeddingProvider {
  return localEmbeddingProvider;
}

export const embeddingProvider = resolveProvider();

/** Cosine similarity. Vectors are L2-normalized on creation, so this is just a dot product. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Clamp: floating-point drift can push a self-comparison a hair past 1.
  return Math.max(-1, Math.min(1, dot));
}

/**
 * The text a job is embedded from. Title is repeated because it's by far
 * the strongest signal of what a job actually is, and a single mention
 * would be swamped by a long description.
 */
export function jobEmbeddingText(job: {
  title: string;
  company?: string | null;
  industry?: string | null;
  description?: string | null;
  requiredSkills?: string[];
  preferredSkills?: string[];
}): string {
  return [
    job.title,
    job.title,
    job.industry ?? "",
    (job.requiredSkills ?? []).join(" "),
    (job.preferredSkills ?? []).join(" "),
    (job.description ?? "").slice(0, 4000),
  ]
    .filter(Boolean)
    .join(" \n ");
}

/** The candidate-side equivalent, so a profile and a job land in the same space. */
export function profileEmbeddingText(profile: {
  headline?: string | null;
  summary?: string | null;
  currentRole?: string | null;
  skills: string[];
  experienceTitles: string[];
  projectNames: string[];
}): string {
  return [
    profile.currentRole ?? "",
    profile.currentRole ?? "",
    profile.headline ?? "",
    profile.experienceTitles.join(" "),
    profile.skills.join(" "),
    profile.projectNames.join(" "),
    profile.summary ?? "",
  ]
    .filter(Boolean)
    .join(" \n ");
}
