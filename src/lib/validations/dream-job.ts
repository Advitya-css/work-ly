import { z } from "zod";

export const dreamJobInputSchema = z.object({
  dreamRole: z.string().trim().min(2, "Tell us the role you're aiming for.").max(200),
  description: z.string().trim().min(50, "Paste the full job description (at least a few sentences)."),
  companyName: z.string().trim().max(200).optional().or(z.literal("")),
  portfolio: z.string().trim().max(2000).optional().or(z.literal("")),
});
