import { describe, expect, it } from "vitest";

import { draftEmail, firstName, heatOf, type Signals } from "@/lib/founding-ten-core";

const base: Signals = { name: "priya sharma", email: "p@x.com", checkoutOpen: false, hadTrial: false, jobsChecked: 0, resumes: 0, lastJob: null };
const offer = { percentOff: 50, forLife: true, spotsLeft: 7, monthlyPrice: "$9.99" };

describe("founding ten emails", () => {
  it("ranks the person by how close they are to paying", () => {
    expect(heatOf({ ...base, checkoutOpen: true, hadTrial: true })).toBe("checkout");
    expect(heatOf({ ...base, hadTrial: true, jobsChecked: 3 })).toBe("tried");
    expect(heatOf({ ...base, jobsChecked: 1 })).toBe("checked");
    expect(heatOf({ ...base, resumes: 1 })).toBe("resume");
    expect(heatOf(base)).toBe("signed_up");
  });

  it("uses a real first name or none", () => {
    expect(firstName("priya sharma")).toBe("Priya");
    expect(firstName("someone@gmail.com")).toBeNull();
    expect(firstName(null)).toBeNull();
  });

  it("names the job they checked and the offer, honestly", () => {
    const d = draftEmail({ ...base, jobsChecked: 1, lastJob: { title: "Senior Data Analyst", company: "Swiggy" } }, offer);
    expect(d.subject).toBe("About Senior Data Analyst at Swiggy");
    expect(d.body).toContain("Hi Priya,");
    expect(d.body).toContain("50% off for life (7 left): $9.99 a month");
    expect(d.body.split(/\s+/).length).toBeLessThan(140);
  });

  it("says nothing about an offer when none is live", () => {
    expect(draftEmail({ ...base, hadTrial: true }, null).body).not.toMatch(/% off/);
  });

  it("doesn't push the offer on people who haven't tried anything", () => {
    expect(draftEmail(base, offer).body).not.toMatch(/% off/);
    expect(draftEmail({ ...base, resumes: 1 }, offer).body).not.toMatch(/% off/);
  });
});
