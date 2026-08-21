import "server-only";
import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";

import type { StorageObject, StorageProvider, StorageUploadInput } from "@/lib/storage/types";

// Deliberately OUTSIDE of /public - anything under public/ is served
// statically to anyone with the URL, which would make uploaded resumes
// world-readable. Keeping this out of the Next.js public directory is
// what makes "CVs must be private" actually true for local dev.
const STORAGE_ROOT = path.join(process.cwd(), "storage", "private");

/**
 * Resolves a key to an absolute path and refuses anything that escapes
 * STORAGE_ROOT.
 *
 * Today every key is built server-side as `resumes/<userId>/<sanitised>`,
 * so traversal isn't reachable. This guards the property directly anyway,
 * because that safety currently rests on a caller two modules away
 * remembering to sanitise. If a key ever arrives from a database row, an
 * import, or a new caller, `path.join` would happily resolve `../../` and
 * turn a file-download endpoint into "read any file on the server".
 *
 * Cheap to enforce, severe to get wrong, and the check belongs next to the
 * filesystem call rather than at the perimeter.
 */
function resolveWithinRoot(key: string): string {
  const resolved = path.resolve(STORAGE_ROOT, key);
  const rootWithSep = STORAGE_ROOT.endsWith(path.sep) ? STORAGE_ROOT : STORAGE_ROOT + path.sep;
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(rootWithSep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

/** Writes to a private, non-public directory on local disk. Fine for development; not for production. */
export const localStorageProvider: StorageProvider = {
  name: "local",
  async upload({ key, data }: StorageUploadInput): Promise<StorageObject> {
    const destination = resolveWithinRoot(key);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, data);
    return { key };
  },
  async download(key: string): Promise<Buffer> {
    return readFile(resolveWithinRoot(key));
  },
  async delete(key: string): Promise<void> {
    await unlink(resolveWithinRoot(key)).catch(() => undefined);
  },
};
