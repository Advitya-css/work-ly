import { describe, expect, it } from "vitest";

import { emailDomain, isDisposableEmail } from "@/lib/disposable-email";

describe("isDisposableEmail", () => {
  it("catches temporary inboxes", () => {
    expect(isDisposableEmail("s3ag6kc6n63e@inboxfast.space")).toBe(true);
    expect(isDisposableEmail("abc@mailinator.com")).toBe(true);
    expect(isDisposableEmail("ABC@YopMail.com")).toBe(true);
    expect(isDisposableEmail("x@sub.guerrillamail.com")).toBe(true);
    expect(isDisposableEmail("x@my-tempmail-box.xyz")).toBe(true);
  });

  it("leaves real and privacy-relay addresses alone", () => {
    for (const email of [
      "priya@gmail.com",
      "advitya@work-ly.in",
      "someone@outlook.com",
      "abc123@privaterelay.appleid.com",
      "x@duck.com",
      "y@mozmail.com",
      "z@simplelogin.com",
      "temp@company.com",
    ]) {
      expect(isDisposableEmail(email), email).toBe(false);
    }
  });

  it("handles junk input", () => {
    expect(isDisposableEmail(null)).toBe(false);
    expect(isDisposableEmail("not-an-email")).toBe(false);
    expect(emailDomain("A@B.Co")).toBe("b.co");
  });
});
