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
      
      const prompt = `You are an elite, $500/hr executive career strategist and industry veteran.\nA candidate wants to become a ${targetRole}.\n${profile.profile?.isFreelanceMode ? "CRITICAL CONTEXT: This candidate operates in the GIG ECONOMY (freelance, contract, or musician). Do NOT give them generic 9-to-5 corporate advice. Tell them how to build an Electronic Press Kit (EPK), pitch to venues, reach out to booking agents, construct a freelance reel, and secure clients directly." : ""}\n\nOne of their 90-day pathway goals is: "${action.title}"\nCurrent generic context: "${action.description}"\n\nYour task: Replace this generic description with a highly actionable, premium, step-by-step masterclass on EXACTLY how to achieve this.\n\nFORMAT REQUIREMENTS (Must use Markdown):\n- Provide 3 specific, tactical steps.\n- For each step, use bolding (e.g. **Step 1: Build the Reel**) followed by the tactical execution plan.\n- Include exactly ONE hyper-specific metric they should track (e.g., "Send 5 personalized pitches this week").\n- Do NOT use abstract corporate fluff like "learn best practices" or "synergize". Name specific platforms, tools, and strategies.\n- Output only the markdown text. No intros/outros. Make it feel incredibly premium and worth paying for.`;

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
