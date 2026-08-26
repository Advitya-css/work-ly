const fs = require('fs');
let code = fs.readFileSync('src/lib/ai/pathway-planner.ts', 'utf8');

const targetPrompt = 'const prompt = `You are a world-class technical career coach.';
const targetEnd = 'Output ONLY the 3 bullet points, using standard \\\'-\\\' markdown lists. No intro, no outro, no asterisks for bolding.`;';

const replacementPrompt = 'const prompt = `You are an elite, $500/hr executive career strategist and industry veteran.\\n' +
'A candidate wants to become a ${targetRole}.\\n' +
'${profile.profile.isFreelanceMode ? "CRITICAL CONTEXT: This candidate operates in the GIG ECONOMY (freelance, contract, or musician). Do NOT give them generic 9-to-5 corporate advice. Tell them how to build an Electronic Press Kit (EPK), pitch to venues, reach out to booking agents, construct a freelance reel, and secure clients directly." : ""}\\n' +
'\\n' +
'One of their 90-day pathway goals is: "${action.title}"\\n' +
'Current generic context: "${action.description}"\\n' +
'\\n' +
'Your task: Replace this generic description with a highly actionable, premium, step-by-step masterclass on EXACTLY how to achieve this.\\n' +
'\\n' +
'FORMAT REQUIREMENTS (Must use Markdown):\\n' +
'- Provide 3 specific, tactical steps.\\n' +
'- For each step, use bolding (e.g. **Step 1: Build the Reel**) followed by the tactical execution plan.\\n' +
'- Include exactly ONE hyper-specific metric they should track (e.g., "Send 5 personalized pitches this week").\\n' +
'- Do NOT use abstract corporate fluff like "learn best practices" or "synergize". Name specific platforms, tools, and strategies.\\n' +
'- Output only the markdown text. No intros/outros. Make it feel incredibly premium and worth paying for.`;';

// Using regex to replace the entire block
code = code.replace(/const prompt = `You are a world-class[\s\S]*?No intro, no outro, no asterisks for bolding.`;/, replacementPrompt);

fs.writeFileSync('src/lib/ai/pathway-planner.ts', code);
