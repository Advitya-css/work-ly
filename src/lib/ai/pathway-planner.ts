import "server-only";
import { aiProvider } from "./index";
import type { NewPathway } from "@/lib/db/career-pathways";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

export async function enhancePathwayWithActionablePlans(
  pathway: NewPathway,
  profile: FullCareerProfile,
  targetRole: string
): Promise<NewPathway> {
  const enhancedActions = await Promise.all(
    pathway.actions.map(async (action) => {
      // Skip structural / admin actions
      if (
        action.title.toLowerCase().includes("analyze three") ||
        action.title.toLowerCase().includes("re-run")
      ) {
        return action;
      }
      
      const prompt = `You are an elite, $500/hr executive career strategist. Your client wants to become a ${targetRole}.
${profile.profile?.isFreelanceMode ? "CRITICAL CONTEXT: This candidate operates in the GIG ECONOMY (freelance, contract, or musician). Do NOT give them generic 9-to-5 corporate advice. Focus on portfolio, networking, clients, etc." : ""}

Their next 30/60/90 day milestone is: "${action.title}"
Current context: "${action.description}"

Your task: Rewrite this milestone's description into a highly actionable, premium, step-by-step masterclass.

CRITICAL REQUIREMENT (FEATURE 3): You MUST recommend a specific free or cheap resource for them to use. 
Name an exact course (e.g., 'Coursera: Meta Front-End Developer', 'Udemy: 100 Days of Code'), a specific certification, or a highly specific project idea that they can build. Do not just say "take a course" — name the exact course and platform.

FORMAT REQUIREMENTS (Must use Markdown):
- Write a 2-sentence highly encouraging intro.
- Provide **3 tactical execution steps**. 
- In one of the steps, clearly highlight the **Recommended Resource** (Course, Cert, or Project) in bold, with the platform name.
- Include exactly ONE hyper-specific metric they should track (e.g., "Send 5 personalized pitches this week").
- Output ONLY the markdown text. No other text. Make it feel incredibly premium and worth paying for.`;

      try {
        const result = await aiProvider.complete({
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
