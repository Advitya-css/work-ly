import { describe, expect, it } from "vitest";

import { addressLooksComplete, isPlausibleEmail, outreachFooter, outreachKey, parseOutreachKey, textToHtml } from "@/lib/outreach-core";

describe("founder emails", () => {
  it("turns plain text into paragraphs with working links, escaping everything else", () => {
    const html = textToHtml("Hi Jane,\n\nTry work-ly.in/free-grader or https://work-ly.in/pricing.\nThanks <3\n\nAdvitya");
    expect(html).toContain('<p style="margin:0 0 14px;">Hi Jane,</p>');
    expect(html).toContain('<a href="https://work-ly.in/free-grader">work-ly.in/free-grader</a>');
    expect(html).toContain('<a href="https://work-ly.in/pricing">https://work-ly.in/pricing</a>.');
    expect(html).toContain("Thanks &lt;3");
    expect(html).not.toContain('https://https://');
    expect(textToHtml("mail advitya@work-ly.in")).not.toContain("<a");
  });

  it("adds the right footer", () => {
    expect(outreachFooter("user", { address: "x", unsubscribeUrl: "https://work-ly.in/u" })).toContain("Unsubscribe: https://work-ly.in/u");
    const cold = outreachFooter("cold", { address: "12 Example Road, Jaipur, India" });
    expect(cold).toContain("12 Example Road");
    expect(cold).toContain('Reply "no"');
  });

  it("wants a real postal address for first emails", () => {
    expect(addressLooksComplete("Jaipur, Rajasthan, India")).toBe(false);
    expect(addressLooksComplete("12 Example Road, Vaishali Nagar, Jaipur 302021, India")).toBe(true);
  });

  it("logs one key per address per day", () => {
    const key = outreachKey("2026-10-01", " Jane@Example.com ");
    expect(parseOutreachKey(key)).toEqual({ day: "2026-10-01", email: "jane@example.com" });
    expect(isPlausibleEmail("jane@example.com")).toBe(true);
    expect(isPlausibleEmail("jane@")).toBe(false);
  });
});
