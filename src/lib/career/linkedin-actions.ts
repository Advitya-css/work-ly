"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import {
  NO_FABRICATION_RULES,
  candidateBrief,
  completeStructured,
  str,
  unsupportedNumbers,
  withinProAiBudget,
} from "@/lib/ai/career-context";
import { HONESTY_RULE, stretchesClaims } from "@/lib/ai/honesty";
import {
  ABOUT_MAX,
  HEADLINE_MAX,
  claimsUnheldTitle,
  cleanMakeoverEdits,
  cleanSkills,
  type LinkedInMakeover,
} from "@/lib/career/linkedin-core";
import { getSavedOutput, saveOutput } from "@/lib/saved-outputs";
import { recordUsage } from "@/lib/usage";

/**
 * THE LINKEDIN MAKEOVER: a headline and About section aimed at the role the
 * person is going for, written only from their profile. Recruiters search
 * LinkedIn by headline and skim the About; most people's say "Data Analyst
 * at QuickBite" and nothing else.
 *
 * Saved under the user (not a job), editable, and checked the same way as
 * every other writing tool: no new numbers passed off as theirs, no advice
 * to claim more, and no headline that wears a title they've never held.
 */

const PROFILE_KEY = "profile";

const SYSTEM = `You rewrite ONE person's LinkedIn headline and About section so recruiters searching for their TARGET ROLE find and believe them.
Return:
- "headlines": exactly 3 options, each under ${HEADLINE_MAX} characters, each with an "angle" (3-6 words saying what it leads with). Option 1: their real current title plus their single strongest measurable result. Option 2: their real current title plus the 3-4 skills the target role is searched by. Option 3: positions them toward the TARGET ROLE using "moving into", "focused on" or similar. Use " | " between parts. Never present the target role as a title they hold unless the CANDIDATE section shows they hold it.
- "about": the About section in first person, 3 short paragraphs and under 1,600 characters. Paragraph 1: what they do and for whom, in one or two sentences, no throat-clearing. Paragraph 2: two or three real proofs from the CANDIDATE section, each with its employer and any real number kept exactly. Paragraph 3: what they're looking for next (the TARGET ROLE, if given) and an invitation to connect. No "passionate", "results-driven", "dynamic", "guru", "ninja", emojis or hashtags.
- "topSkills": the 5 skills from the SKILLS list most searched for the TARGET ROLE, copied exactly.
${HONESTY_RULE}
${NO_FABRICATION_RULES}`;

export async function generateLinkedInMakeoverAction(): Promise<{ data: LinkedInMakeover; savedAt: string | null } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!user.isPro) return { error: "The LinkedIn makeover is a Pro feature." };
  if (!(await withinProAiBudget(user.id))) {
    return { error: "You've used a lot of AI tools this hour. Try again in a little while." };
  }

  const [profile, goal] = await Promise.all([getFullCareerProfile(user.id), getPrimaryCareerGoal(user.id)]);
  if (profile.experiences.length === 0 && profile.projects.length === 0) {
    return { error: "Add your experience (or upload your resume) first. There's nothing to write from yet." };
  }
  await recordUsage(user.id, "tailor");

  const targetRole = goal?.primaryTargetRole?.trim() || null;
  const skills = profile.skills.filter((s) => !s.isTransferable).map((s) => s.name);
  const heldTitles = profile.experiences.map((e) => e.title).filter(Boolean);
  const candidate = candidateBrief(profile, 7000);

  const result = await completeStructured({
    quality: "high",
    system: SYSTEM,
    user: `TARGET ROLE: ${targetRole ?? "(not set: aim at the next step up from their current role)"}\nNAME: ${user.name ?? ""}\nSKILLS: ${skills.join(", ") || "(none)"}\n\nCANDIDATE\n=========\n${candidate}`,
    schema: {
      type: "object",
      properties: {
        headlines: {
          type: "array",
          items: { type: "object", properties: { text: { type: "string" }, angle: { type: "string" } }, required: ["text", "angle"] },
        },
        about: { type: "string" },
        topSkills: { type: "array", items: { type: "string" } },
      },
      required: ["headlines", "about", "topSkills"],
    },
    temperature: 0.5,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const about = str(r.about, ABOUT_MAX);
      if (!about || stretchesClaims(about)) return null;
      const headlines = (Array.isArray(r.headlines) ? r.headlines : [])
        .map((h) => {
          const o = (h ?? {}) as Record<string, unknown>;
          return { text: (str(o.text, 400) ?? "").replace(/\s+/g, " "), angle: str(o.angle, 60) ?? "" };
        })
        .filter((h) => h.text && h.text.length <= HEADLINE_MAX && !stretchesClaims(h.text) && !claimsUnheldTitle(h.text, targetRole, heldTitles))
        .slice(0, 3);
      if (headlines.length === 0) return null;
      return {
        targetRole,
        headlines,
        about: about.replace(/\n{3,}/g, "\n\n"),
        topSkills: cleanSkills(r.topSkills, skills, 5),
        unverifiedNumbers: [] as string[],
      } satisfies LinkedInMakeover;
    },
  });
  if (!result) return { error: "Couldn't write it right now. Please try again." };
  result.unverifiedNumbers = unsupportedNumbers(`${result.about} ${result.headlines.map((h) => h.text).join(" ")}`, candidate);
  const savedAt = await saveOutput(user.id, "linkedin", PROFILE_KEY, result);
  revalidatePath("/linkedin");
  return { data: result, savedAt };
}

export async function saveLinkedInEditsAction(fields: Record<string, unknown>): Promise<{ savedAt: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!user.isPro) return { error: "This is a Pro feature." };
  const saved = await getSavedOutput<LinkedInMakeover>(user.id, "linkedin", PROFILE_KEY);
  if (!saved) return { error: "Nothing to save yet." };
  const next = cleanMakeoverEdits(saved.data, fields);
  const savedAt = await saveOutput(user.id, "linkedin", PROFILE_KEY, next, { edited: true });
  return savedAt ? { savedAt } : { error: "Couldn't save your edits. Copy them somewhere safe and try again." };
}
