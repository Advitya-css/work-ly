import { describe, expect, it, vi } from "vitest";

/**
 * The free "top of your resume" preview must never say anything the resume
 * doesn't. The model is replaced by whatever each test hands back, and the
 * real validation decides what reaches the visitor.
 */

let RAW: unknown = null;
let LAST_USER = "";
vi.mock("@/lib/ai/career-context", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/career-context")>();
  return {
    ...real,
    completeStructured: async (p: { user: string; validate: (v: unknown) => unknown }) => {
      LAST_USER = p.user;
      return p.validate(RAW);
    },
  };
});

import { writeOpeningPreview } from "@/lib/resume/opening-preview";

const RESUME = `Priya Raman, Data Analyst
Built 40+ dbt models on BigQuery that power the delivery-ops dashboards used by 120 city managers.
Ran 18 A/B tests on checkout and delivery-fee experiments; one lifted conversion 3.2%.
Automated weekly reporting in Python, saving the ops team 6 hours a week.`;
const JOB = "Data Analyst. Strong SQL and dbt. A/B testing. Python.";
const L1 = "Built 40+ dbt models on BigQuery that power the delivery-ops dashboards used by 120 city managers.";
const L2 = "Ran 18 A/B tests on checkout and delivery-fee experiments; one lifted conversion 3.2%.";

async function run(raw: unknown) {
  RAW = raw;
  return writeOpeningPreview(RESUME, JOB);
}

describe("writeOpeningPreview", () => {
  it("keeps a grounded summary and two grounded rewrites", async () => {
    const out = await run({
      summary: "Data analyst behind 40+ dbt models used by 120 city managers. Brings SQL, dbt and A/B testing.",
      bullets: [
        { basedOn: L1, text: "Built 40+ dbt data models on BigQuery behind dashboards used by 120 city managers." },
        { basedOn: L2, text: "Designed and ran 18 A/B tests; one lifted conversion 3.2%." },
      ],
    });
    expect(out?.summary).toMatch(/^Data analyst/);
    expect(out?.bullets.map((b) => b.from)).toEqual([L1, L2]);
    expect(out?.bullets[1].text).toMatch(/^Designed/);
  });

  it("drops a summary with a number the resume doesn't have", async () => {
    const out = await run({
      summary: "Data analyst with 7 years of experience and 500 dashboards.",
      bullets: [{ basedOn: L1, text: L1 }],
    });
    expect(out?.summary).toBeNull();
    expect(out?.bullets).toHaveLength(1);
  });

  it("drops a line that isn't on the resume at all", async () => {
    const out = await run({
      summary: "Data analyst who builds dbt models.",
      bullets: [{ basedOn: "Led a team of 12 engineers at Google.", text: "Led a team of 12 engineers at Google." }],
    });
    expect(out?.bullets).toEqual([]);
  });

  it("sends back the original line when a rewrite adds or drops a number", async () => {
    const out = await run({
      summary: "Data analyst.",
      bullets: [
        { basedOn: L1, text: "Built 60+ dbt models used by 300 city managers." },
        { basedOn: L2, text: "Ran A/B tests on checkout experiments." },
      ],
    });
    expect(out?.bullets.map((b) => b.text)).toEqual([L1, L2]);
  });

  it("never shows the same line twice, and at most two", async () => {
    const out = await run({
      summary: "Data analyst.",
      bullets: [
        { basedOn: L1, text: L1 },
        { basedOn: L1, text: L1 },
        { basedOn: L2, text: L2 },
        { basedOn: "Automated weekly reporting in Python, saving the ops team 6 hours a week.", text: "Automated weekly reporting in Python, saving 6 hours a week." },
      ],
    });
    expect(out?.bullets.map((b) => b.from)).toEqual([L1, L2]);
  });

  it("returns nothing when nothing survives, and copes with junk", async () => {
    expect(await run({ summary: "Has 99 certifications.", bullets: [] })).toBeNull();
    expect(await run({ summary: 42, bullets: "nope" })).toBeNull();
    expect(await run(null)).toBeNull();
  });

  it("strips bullet characters the model copied from the resume", async () => {
    const out = await run({ summary: "Data analyst.", bullets: [{ basedOn: `• ${L1}`, text: L1 }] });
    expect(out?.bullets[0].from).toBe(L1);
  });

  it("sends the job and the resume as labelled data", async () => {
    await run({ summary: "Data analyst.", bullets: [] });
    expect(LAST_USER).toMatch(/^JOB\n===\n/);
    expect(LAST_USER).toContain("\n\nCANDIDATE\n=========\n");
  });
});
