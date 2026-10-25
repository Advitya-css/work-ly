import { describe, expect, it } from "vitest";

import { EMPTY_COUNTS, capitalise, describeSavedWork, previewOf, savedVerb } from "../src/lib/saved-work-core";

describe("saved work in words", () => {
  it("names what was built", () => {
    expect(describeSavedWork({ ...EMPTY_COUNTS, resume: 2, cover: 1 })).toBe("2 tailored resumes and a cover letter");
    expect(describeSavedWork({ ...EMPTY_COUNTS, resume: 1, note: 2, linkedin: 1 })).toBe(
      "a tailored resume, 2 notes to hiring managers and your LinkedIn makeover",
    );
    expect(describeSavedWork(EMPTY_COUNTS)).toBe("");
  });
  it("agrees in number", () => {
    expect(savedVerb({ ...EMPTY_COUNTS, cover: 1 })).toBe("is");
    expect(savedVerb({ ...EMPTY_COUNTS, resume: 2 })).toBe("are");
    expect(savedVerb({ ...EMPTY_COUNTS, resume: 1, cover: 1 })).toBe("are");
    expect(capitalise(describeSavedWork({ ...EMPTY_COUNTS, resume: 1 }))).toBe("A tailored resume");
  });
  it("cuts previews at a word", () => {
    expect(previewOf("Dear Hiring Team, Swiggy's delivery operations team is asking for someone", 40)).toBe(
      "Dear Hiring Team, Swiggy's delivery…",
    );
    expect(previewOf("Short.")).toBe("Short.");
  });
});
