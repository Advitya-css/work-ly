import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * The hard rule this file defends:
 *
 *   "A user must never be able to access another user's CV, career profile
 *    or applications."
 *
 * Two layers, tested two ways.
 *
 * 1. The query layer (needs Postgres, so it is opt-in via WORKLY_TEST_DB=1).
 *    Every list-by-user query is seeded with TWO real users and must return
 *    only the caller's rows. A LIKE filter, a forgotten WHERE, or a JOIN that
 *    fans out would show up here immediately.
 *
 * 2. The guard layer (pure source analysis, always runs). Fetch-by-id queries
 *    deliberately do NOT filter by user — ownership is checked one level up,
 *    in the server action or the page. That is a sound design only for as
 *    long as every one of those callers actually performs the check, so the
 *    check itself is asserted here rather than assumed.
 */

const SRC = path.resolve(__dirname, "..", "src");
const RUN_DB = process.env.WORKLY_TEST_DB === "1";
const dbDescribe = RUN_DB ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Layer 1 — the queries themselves
// ---------------------------------------------------------------------------

dbDescribe("cross-user data isolation (database)", () => {
  // Imported lazily: these modules open a connection pool at import time, so
  // pulling them in at the top of the file would make `npm test` require a
  // database even when the DB suite is skipped.
  let db: {
    pool: typeof import("@/lib/db/pool").pool;
    createUser: typeof import("@/lib/db/users").createUser;
    getOrCreateCareerProfile: typeof import("@/lib/db/career-profile").getOrCreateCareerProfile;
    upsertCareerProfile: typeof import("@/lib/db/career-profile").upsertCareerProfile;
    getCareerProfileByUserId: typeof import("@/lib/db/career-profile").getCareerProfileByUserId;
    createDocument: typeof import("@/lib/db/documents").createDocument;
    listDocumentsByUserId: typeof import("@/lib/db/documents").listDocumentsByUserId;
    getDocumentById: typeof import("@/lib/db/documents").getDocumentById;
    createJob: typeof import("@/lib/db/jobs").createJob;
    listJobsByUserId: typeof import("@/lib/db/jobs").listJobsByUserId;
    createApplication: typeof import("@/lib/db/applications").createApplication;
    listApplicationsByUserId: typeof import("@/lib/db/applications").listApplicationsByUserId;
    getApplicationById: typeof import("@/lib/db/applications").getApplicationById;
  };

  const users: { a: string; b: string } = { a: "", b: "" };
  const owned: { aApp: string; bApp: string; bDoc: string } = { aApp: "", bApp: "", bDoc: "" };
  const emails: string[] = [];

  beforeAll(async () => {
    db = {
      pool: (await import("@/lib/db/pool")).pool,
      ...(await import("@/lib/db/users")),
      ...(await import("@/lib/db/career-profile")),
      ...(await import("@/lib/db/documents")),
      ...(await import("@/lib/db/jobs")),
      ...(await import("@/lib/db/applications")),
    } as typeof db;

    const stamp = `${process.pid}-${Date.now()}`;

    async function seed(tag: string) {
      const email = `isolation-${tag}-${stamp}@workly.test`;
      emails.push(email);
      const user = await db.createUser({ email, passwordHash: "not-a-real-hash", name: tag });

      await db.getOrCreateCareerProfile(user.id);
      await db.upsertCareerProfile(user.id, {
        headline: `${tag} headline`,
        summary: `${tag} private summary`,
      });

      const doc = await db.createDocument({
        userId: user.id,
        fileName: `${tag}-cv.pdf`,
        fileType: "PDF",
        fileSizeBytes: 1024,
        storageKey: `${tag}/${stamp}.pdf`,
      });

      await db.createJob(user.id, {
        inputMethod: "PASTED_TEXT",
        rawInput: `${tag} pasted job description`,
      });

      const application = await db.createApplication(user.id, {
        roleTitle: `${tag} Product Analyst`,
        company: `${tag} Corp`,
      });

      return { user, doc, application };
    }

    const a = await seed("alpha");
    const b = await seed("bravo");
    users.a = a.user.id;
    users.b = b.user.id;
    owned.aApp = a.application.id;
    owned.bApp = b.application.id;
    owned.bDoc = b.doc.id;
  });

  afterAll(async () => {
    if (!db) return;
    if (emails.length) {
      await db.pool.query(`DELETE FROM users WHERE email = ANY($1::text[])`, [emails]);
    }
    await db.pool.end();
  });

  it("never returns another user's applications", async () => {
    const mine = await db.listApplicationsByUserId(users.a);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((row) => row.userId === users.a)).toBe(true);
    expect(mine.some((row) => row.id === owned.bApp)).toBe(false);
  });

  it("never returns another user's uploaded CV", async () => {
    const mine = await db.listDocumentsByUserId(users.a);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((row) => row.userId === users.a)).toBe(true);
    expect(mine.some((row) => row.id === owned.bDoc)).toBe(false);
  });

  it("never returns another user's analysed jobs", async () => {
    const mine = await db.listJobsByUserId(users.a);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((row) => row.userId === users.a)).toBe(true);
  });

  it("keeps career profiles separate", async () => {
    const a = await db.getCareerProfileByUserId(users.a);
    const b = await db.getCareerProfileByUserId(users.b);
    expect(a?.headline).toBe("alpha headline");
    expect(b?.headline).toBe("bravo headline");
    expect(a?.id).not.toBe(b?.id);
  });

  it("enforces ownership at the query level for fetch-by-id", async () => {
    // Fetch-by-id must now filter by owner directly in the query
    const application = await db.getApplicationById(users.a, owned.bApp);
    const document = await db.getDocumentById(users.a, owned.bDoc);
    expect(application).toBeNull();
    expect(document).toBeNull();
  });

  it("removes a user's data with the user", async () => {
    const throwaway = `isolation-cascade-${process.pid}-${Date.now()}@workly.test`;
    const user = await db.createUser({ email: throwaway, passwordHash: "x" });
    await db.createApplication(user.id, { roleTitle: "Temp", company: "Temp" });
    await db.pool.query(`DELETE FROM users WHERE id = $1`, [user.id]);
    const left = await db.listApplicationsByUserId(user.id);
    expect(left).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — the guards that make layer 1's design safe
// ---------------------------------------------------------------------------

function walk(dir: string, match: (file: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, match));
    else if (match(full)) out.push(full);
  }
  return out;
}

/** Actions that must run before anyone is signed in, and so cannot require a user. */
const PUBLIC_ACTIONS = new Set(["signUpAction", "signInAction", "signOutAction"]);
const GUARD = /getCurrentUser|requireUser|requireOwned|requireAuth/;

describe("server action guards", () => {
  const files = walk(SRC, (f) => f.endsWith(".ts")).filter((f) =>
    readFileSync(f, "utf8").includes('"use server"'),
  );

  it("finds the server action files", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("requires an authenticated user in every action except the auth entry points", () => {
    const unguarded: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      // Split on exported async functions and check each body in isolation —
      // a guard in one action says nothing about the one below it.
      const parts = source.split(/export async function /).slice(1);
      for (const part of parts) {
        const name = part.slice(0, part.indexOf("(")).trim();
        if (PUBLIC_ACTIONS.has(name)) continue;
        if (!GUARD.test(part)) unguarded.push(`${path.relative(SRC, file)}:${name}`);
      }
    }

    expect(unguarded, `unguarded server actions: ${unguarded.join(", ")}`).toEqual([]);
  });
});

describe("dynamic page guards", () => {
  const pages = walk(path.join(SRC, "app"), (f) => f.endsWith("page.tsx")).filter((f) =>
    f.includes("["),
  );

  it("finds the dynamic pages", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it("compares the record's owner to the signed-in user before rendering", () => {
    const missing: string[] = [];
    for (const page of pages) {
      const source = readFileSync(page, "utf8");
      const checksOwner = /userId !== user\.id|userId !== currentUser\.id/.test(source);
      if (!checksOwner) missing.push(path.relative(SRC, page));
    }
    expect(missing, `pages without an ownership check: ${missing.join(", ")}`).toEqual([]);
  });
});
