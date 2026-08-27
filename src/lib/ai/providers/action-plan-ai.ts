import { aiProvider } from "@/lib/ai";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { DreamJobAnalysis, GapPriority } from "@/lib/db/types";
import { SCENARIO_KINDS } from "@/lib/pathway/what-if-types";

export interface PremiumActionPlan {
  thirtyDays: ActionItem[];
  sixtyDays: ActionItem[];
  ninetyDays: ActionItem[];
}

export interface ActionItem {
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  relatedSkill: string | null;
  // Feature 3 specific:
  resourceSuggestion?: string | null;
  resourceLink?: string | null;
}

export async function generatePremiumActionPlan(
  profile: FullCareerProfile,
  targetRole: string,
  gaps: GapPriority[]
): Promise<PremiumActionPlan> {
  const gapContext = gaps.map(g => `- \${g.title} (\${g.category}): \${g.reasoning}`).join("\\n");
  
  const prompt = `You are an elite, $500/hr executive career strategist. Your client wants to land a role as a \${targetRole}.
Here is their profile summary: \${profile.profile?.headline || "Not provided"} - \${profile.profile?.summary || ""}
Here are their critical skill gaps identified by our engine:
\${gapContext || "None explicitly identified. Focus on networking, portfolio building, and interviewing."}

Your job is to build a hyper-specific, highly actionable 30/60/90 day curriculum to close these gaps.
Do NOT use generic corporate fluff.
For each action item, if it involves learning a skill or closing a gap, you MUST provide a specific real-world resource (e.g., "Coursera: Google Data Analytics Professional Certificate", "FrontendMasters: Advanced React", "AWS Certified Solutions Architect Official Guide").

Output strictly valid JSON matching this structure:
{
  "thirtyDays": [
    {
      "title": "Short action title",
      "description": "Tactical, 3-step masterclass on how to execute this.",
      "estimatedTime": "e.g., 2 weeks, or 10 hours",
      "difficulty": "Easy" | "Moderate" | "Hard",
      "relatedSkill": "Name of the skill, or null",
      "resourceSuggestion": "Name of a specific course, cert, or project idea",
      "resourceLink": "A real or search-friendly URL or platform name (e.g., 'coursera.org/learn/x')"
    }
  ],
  "sixtyDays": [...],
  "ninetyDays": [...]
}
Return ONLY the JSON. No markdown fences, no prose.`;

  const res = await aiProvider.complete({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  try {
    const raw = res.content.replace(/^[\\s\\S]*?\\{/, "{").replace(/\\s*\\}[\\s\\S]*$/, "}");
    const parsed = JSON.parse(raw) as PremiumActionPlan;
    if (!parsed.thirtyDays || !parsed.sixtyDays || !parsed.ninetyDays) {
      throw new Error("Invalid schema");
    }
    return parsed;
  } catch (err) {
    console.error("Action Plan AI Error:", err, res.content);
    throw new Error("Failed to generate premium action plan.");
  }
}
