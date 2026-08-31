"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { aiProvider } from "@/lib/ai";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { findKnowledge, knowledgeById } from "@/lib/chat/knowledge";
import { safeMessage } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

/**
 * The "Ask Work-ly" helper.
 *
 * Three deliberate constraints shape this:
 *
 * 1. CURATED ANSWERS WIN. Questions about how Work-ly works have exact answers
 *    that live in this codebase. A model asked "what is the Fit score" would
 *    invent a plausible formula, and be wrong. Those are answered from
 *    lib/chat/knowledge.ts first, so they are always right and always free.
 *
 * 2. IT WORKS WITH NO API KEY. Most people will run this without configuring
 *    a provider. Without one the helper still answers everything in the
 *    knowledge base and says plainly what it cannot do, rather than failing.
 *
 * 3. IT STAYS ON TOPIC. The system prompt scopes it to careers, job hunting
 *    and using Work-ly, and forbids the two things this product must never do:
 *    claim a probability of being hired, and invent facts about a specific
 *    job or company.
 */

const OFF_TOPIC =
  "I can only help with your career, job hunting and using Work-ly. Ask me about a score, a gap, what to do next, or how something here works.";

/** Cheap guard so obviously unrelated questions never reach the model. */
const CAREER_WORDS = [
  "job", "role", "career", "cv", "resume", "skill", "interview", "apply", "application",
  "salary", "hire", "hiring", "employer", "recruit", "score", "fit", "priority", "gap",
  "profile", "goal", "path", "opportunit", "workly", "experience", "qualification",
  "cover letter", "portfolio", "promotion", "industry", "seniority", "offer", "reject",
  "discover", "search", "company", "work", "employment", "internship", "graduate",
  "reference", "linkedin", "networking", "negotiat", "notice period", "contract",
  "location", "setting", "preference", "remote", "hybrid", "onsite", "education", 
  "degree", "school", "university", "college", "project", "certification", "dashboard",
  "account", "password", "email", "name", "delete", "edit", "update", "change"
];

function looksCareerRelated(question: string): boolean {
  const text = question.toLowerCase();
  return CAREER_WORDS.some((word) => text.includes(word));
}

export interface ChatReply {
  answer: string;
  /** Where the answer came from, shown to the user so they can weigh it. */
  source: "workly" | "ai" | "unavailable";
}

export async function askWorklyAction(
  question: string,
  pathname: string,
  /**
   * Set when the user tapped one of the suggested questions. Looking the
   * answer up by id removes any dependence on matching the text, which is
   * what made a tapped suggestion fall through to the model and answer
   * "I do not have that built in" about a question Work-ly wrote itself.
   */
  knownId?: string,
): Promise<ChatReply> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`chat_${ip}`, 20, 60))) {
    return { answer: "You've asked too many questions recently. Please try again later.", source: "workly" };
  }
  const trimmed = question.trim();
  if (!trimmed) {
    return { answer: "Ask me anything about your job search.", source: "workly" };
  }
  if (trimmed.length > 1000) {
    return {
      answer: "That is a long question. Try asking it in a sentence or two.",
      source: "workly",
    };
  }

  // 1. Curated answers first, because they are correct by construction.
  const known = (knownId ? knowledgeById(knownId) : null) ?? findKnowledge(trimmed);
  if (known) {
    return { answer: known.answer, source: "workly" };
  }

  if (!looksCareerRelated(trimmed)) {
    return { answer: OFF_TOPIC, source: "workly" };
  }

  // 2. Anything else goes to the model, if one is configured.
  const provider = aiProvider;
  if (provider.name === "stub") {
    return {
      answer:
        "I do not have an answer for that one built in, and live AI is switched off, so I cannot work it out.\n\nTo turn it on: get a key at aistudio.google.com/apikey, paste it into AI_API_KEY in your .env file, then run `npm run check:ai` to confirm it is working.",
      source: "unavailable",
    };
  }

  // Context, so the answer is about THIS person rather than generic advice.
  // Deliberately a short summary and never the raw CV: there is no reason to
  // send a whole document to answer a question about it.
  const [profile, goal] = await Promise.all([
    getCareerProfileByUserId(user.id),
    getPrimaryCareerGoal(user.id),
  ]);

  const context = [
    profile?.headline ? `Their headline: ${profile.headline}` : null,
    profile?.currentRole ? `Current role: ${profile.currentRole}` : null,
    profile?.yearsExperience != null
      ? `Years of experience: ${profile.yearsExperience}`
      : "Years of experience: not recorded",
    goal?.primaryTargetRole ? `Target role: ${goal.primaryTargetRole}` : "No target role set yet",
    goal?.industries?.length ? `Target industries: ${goal.industries.join(", ")}` : null,
    `They are currently looking at the ${pathname} screen.`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = [
    "You are the help assistant inside Work-ly, a career intelligence tool.",
    "Answer questions about careers, job hunting, applications, interviews and using Work-ly.",
    "If asked about anything else, say you only cover careers and job hunting.",
    "",
    "Hard rules:",
    "- Never state or imply someone's chance, odds or probability of being hired. Work-ly reports how well a profile matches a posting, nothing more.",
    "- Never invent details about a specific job, company or salary. If you do not know, say so and suggest where in Work-ly they can check.",
    "- Do not promise outcomes. Give practical, concrete next steps instead.",
    "- Be brief. Two or three short paragraphs at most, and prefer a short list when the answer is a sequence of steps.",
    "- Write plainly, for someone who may be new to job hunting. No jargon without explaining it.",
    "- If asked how to navigate the app: 'My career' contains Profile, Goals, Dream job, and Career path. 'Jobs' contains Opportunities, Discover, and Analyze. 'Settings' has account controls.",
    "",
    "About the person you are helping:",
    context,
  ].join("\n");

  try {
    const result = await provider.complete({
      messages: [
        { role: "system", content: system },
        { role: "user", content: trimmed },
      ],
      temperature: 0.4,
    });

    const answer = result.content?.trim();
    if (!answer) {
      return {
        answer: "I could not come up with an answer for that. Try rephrasing it.",
        source: "unavailable",
      };
    }
    return { answer, source: "ai" };
  } catch (error) {
    // safeMessage keeps provider errors, keys and stack traces off the screen
    // while still logging the detail server-side against a reference code.
    return { answer: safeMessage(error, "chat"), source: "unavailable" };
  }
}
