import { z } from "zod";

export const jobInputSchema = z
  .object({
    inputMethod: z.enum(["PASTED_TEXT", "URL"]),
    text: z.string().trim().max(20000).optional().or(z.literal("")),
    url: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.inputMethod === "PASTED_TEXT" && (!data.text || data.text.length < 50)) {
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: "Paste the full job description (at least a few sentences).",
      });
    }
    if (data.inputMethod === "URL" && !data.url) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "Enter a job posting URL." });
    }
  });
