import { describe, expect, it } from "vitest";

import { humanPunctuation } from "@/lib/ai/career-context";

/**
 * Everything Work-ly writes for someone to send goes through this. The em
 * dash is the giveaway that a machine wrote a cover letter, so it becomes
 * the comma a person would have used; real ranges are left alone.
 */
describe("humanPunctuation", () => {
  it("turns an em dash between words into a comma", () => {
    expect(humanPunctuation("I built the pipeline — and the dashboards on top of it.")).toBe(
      "I built the pipeline, and the dashboards on top of it.",
    );
    expect(humanPunctuation("Three things—speed, cost and trust—decided it.")).toBe("Three things, speed, cost and trust, decided it.");
  });

  it("leaves ranges of numbers and dates alone", () => {
    expect(humanPunctuation("Jul 2017 – May 2021")).toBe("Jul 2017 – May 2021");
    expect(humanPunctuation("$90,000 – $110,000")).toBe("$90,000 – $110,000");
    expect(humanPunctuation("2019–2022")).toBe("2019–2022");
  });

  it("turns an en dash used as punctuation into a comma", () => {
    expect(humanPunctuation("It worked – once the data was clean.")).toBe("It worked, once the data was clean.");
  });

  it("never leaves doubled or dangling punctuation", () => {
    expect(humanPunctuation("Shipped it — , on time.")).toBe("Shipped it, on time.");
    expect(humanPunctuation("Done —. Next.")).toBe("Done. Next.");
    expect(humanPunctuation("— Built the thing")).toBe("Built the thing");
    expect(humanPunctuation("Built  the   thing")).toBe("Built the thing");
  });

  it("leaves ordinary writing untouched", () => {
    const plain = "Built 40+ dbt models on BigQuery that power the delivery-ops dashboards used by 120 city managers.";
    expect(humanPunctuation(plain)).toBe(plain);
    expect(humanPunctuation("A well-run, fast-paced team.")).toBe("A well-run, fast-paced team.");
  });
});
