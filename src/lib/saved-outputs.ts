import "server-only";

import { storageProvider } from "@/lib/storage";

/**
 * SAVED AI OUTPUTS - the tailored resume, cover letter, hiring-manager note
 * and interview questions for each job, kept so that opening them again is
 * instant and free, and so edits to them survive a refresh.
 *
 * Before this, every open of the tailored resume was a fresh 30-45 second
 * model call that counted against the hourly AI budget, and anything the
 * user edited was gone on reload. That made a paid feature feel disposable.
 *
 * Stored as one private JSON file per user per kind in the same private
 * bucket as uploaded CVs (no schema change): `generated/<userId>/<kind>.json`
 * holding the most recent outputs keyed by opportunity id. Everything here
 * is best-effort: a storage hiccup means "build it again", never an error.
 */

export const SAVED_KINDS = ["resume", "cover", "note", "interview"] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

/** Enough for a busy search; the oldest drop off first. */
const MAX_ENTRIES = 40;

export interface SavedEntry<T> {
  savedAt: string;
  /** True once the user has changed the generated text themselves. */
  edited?: boolean;
  data: T;
}

type SavedFile = { v: 1; items: Record<string, SavedEntry<unknown>> };

function keyFor(userId: string, kind: SavedKind): string {
  // Ids are server-issued UUIDs; strip anything else so a key can never
  // walk out of the user's folder.
  return `generated/${userId.replace(/[^\w-]/g, "")}/${kind}.json`;
}

async function readFile(userId: string, kind: SavedKind): Promise<SavedFile> {
  try {
    const buffer = await storageProvider.download(keyFor(userId, kind));
    const parsed = JSON.parse(buffer.toString("utf8")) as SavedFile;
    if (parsed && parsed.v === 1 && parsed.items && typeof parsed.items === "object") return parsed;
  } catch {
    // Missing file or storage unavailable: nothing saved yet.
  }
  return { v: 1, items: {} };
}

export async function getSavedOutput<T>(userId: string, kind: SavedKind, opportunityId: string): Promise<SavedEntry<T> | null> {
  const file = await readFile(userId, kind);
  const entry = file.items[opportunityId];
  return entry ? (entry as SavedEntry<T>) : null;
}

/**
 * When an output was saved for this job, or null. Bounded: a slow storage
 * call must not hold up the page it's shown on, so after `timeoutMs` the
 * answer is simply "not known" (null).
 */
export async function savedAtWithin(userId: string, kind: SavedKind, opportunityId: string, timeoutMs = 700): Promise<string | null> {
  const lookup = getSavedOutput<unknown>(userId, kind, opportunityId).then((entry) => entry?.savedAt ?? null);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([lookup, timeout]).catch(() => null);
}

/** Which jobs already have each kind of output saved, for "ready" badges. */
export async function savedOutputKinds(userId: string, opportunityId: string): Promise<Set<SavedKind>> {
  const files = await Promise.all(SAVED_KINDS.map(async (kind) => [kind, await readFile(userId, kind)] as const));
  return new Set(files.filter(([, file]) => Boolean(file.items[opportunityId])).map(([kind]) => kind));
}

export async function saveOutput<T>(
  userId: string,
  kind: SavedKind,
  opportunityId: string,
  data: T,
  options: { edited?: boolean } = {},
): Promise<string | null> {
  try {
    const file = await readFile(userId, kind);
    const savedAt = new Date().toISOString();
    file.items[opportunityId] = { savedAt, edited: options.edited || undefined, data };
    const ids = Object.keys(file.items);
    if (ids.length > MAX_ENTRIES) {
      ids
        .sort((a, b) => file.items[a].savedAt.localeCompare(file.items[b].savedAt))
        .slice(0, ids.length - MAX_ENTRIES)
        .forEach((id) => delete file.items[id]);
    }
    await storageProvider.upload({
      key: keyFor(userId, kind),
      data: Buffer.from(JSON.stringify(file), "utf8"),
      contentType: "application/json",
    });
    return savedAt;
  } catch (error) {
    console.warn(`[workly:saved] couldn't save ${kind}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Removes every saved output for this user (account or career-data deletion). */
export async function deleteSavedOutputs(userId: string): Promise<void> {
  await Promise.all(
    SAVED_KINDS.map(async (kind) => {
      try {
        await storageProvider.delete(keyFor(userId, kind));
      } catch {
        // Already gone is the desired state.
      }
    }),
  );
}
