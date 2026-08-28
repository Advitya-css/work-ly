import "server-only";
import { aiProvider } from "@/lib/ai";
import { stripPromptInjectionMarkers } from "@/lib/ai/prompt-injection-guard";

const SYSTEM_PROMPT = `You are an assistant that extracts target company names from job search queries.
If the user's query explicitly names a specific company they want to work for (e.g., "Data Analyst at Stripe", "Jobs at Airbnb", "Spotify software engineer"), return the lowercase ATS slug for that company (e.g., "stripe", "airbnb", "spotify").
If the query does NOT name a specific company, or just names a broad industry (e.g., "finance", "tech", "startup"), return null.
Output exactly this JSON format: { "companySlug": "slug" } or { "companySlug": null }.`;

const RESPONSE_SCHEMA = {
  name: "extract_company",
  schema: {
    type: "object",
    properties: {
      companySlug: { type: ["string", "null"] },
    },
    required: ["companySlug"],
  },
};

export async function extractTargetCompany(query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const result = await aiProvider.complete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: stripPromptInjectionMarkers(trimmed.slice(0, 500)) },
      ],
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    });

    const parsed = (result.parsed ?? {}) as { companySlug?: unknown };
    if (typeof parsed.companySlug === "string" && parsed.companySlug.trim().length > 0) {
      return parsed.companySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    }
    return null;
  } catch (error) {
    return null;
  }
}
