import "server-only";
import { googleGenAIProvider } from "./providers/google-genai";
import type { NewPathway } from "@/lib/db/career-pathways";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

export async function enhancePathwayWithActionablePlans(
  pathway: NewPathway,
  profile: FullCareerProfile,
  targetRole: string
): Promise<NewPathway> {
  const enhancedActions = await Promise.all(
    pathway.actions.map(async (action) => {
      // Skip very generic actions that are already self-explanatory
      if (
        action.title.toLowerCase().includes("apply to") ||
        action.title.toLowerCase().includes("analyze three") ||
        action.title.toLowerCase().includes("re-run") ||
        action.title.toLowerCase().includes("add evidence")
      ) {
        return action;
      }
      
      const prompt = `You are a world-class technical career coach.
A candidate wants to become a ${targetRole}.
One of their 90-day pathway goals is: "${action.title}"

Current context/generic reason: "${action.description}"

Your task: Replace this generic description with a highly actionable, realistic 3-point plan on EXACTLY how to achieve this.
- Tell them specific things they can do (e.g. build a specific type of project, read a specific concept, use a specific dataset or tool).
- Do NOT use abstract words like "learn best practices" or "familiarize yourself".
- Make it 3 bullet points, concise and direct.

Output ONLY the 3 bullet points, using standard '-' markdown lists. No intro, no outro, no asterisks for bolding.`;

      try {
        const result = await googleGenAIProvider.complete({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        });
        
        if (result.content && result.content.length > 20) {
          return { ...action, description: result.content.trim() };
        }
      } catch (err) {
        console.error(`[workly:pathway-planner] failed to enhance action ${action.title}:`, err);
      }
      return action;
    })
  );

  return { ...pathway, actions: enhancedActions };
}
