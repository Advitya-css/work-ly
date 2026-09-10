"use server";

import { aiProvider } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

/**
 * PIVOT DATA SHAPES
 *
 * Shared between the server action and the client wizard so neither side
 * has to fall back to `any` to read what the other produced. These are also
 * what a CareerPivot row's JSON columns get cast to once they've been
 * validated on the way in - see the sanitizing in generatePivotAction below.
 */
export interface CompetencyMapEntry {
  oldSkill: string;
  newSkill: string;
  explanation: string;
}

export interface TranslatedBulletEntry {
  original: string;
  translated: string;
}

export interface HardGapEntry {
  missingSkill: string;
  actionPlan: string;
}

export interface PivotData {
  id: string;
  targetRole: string;
  targetIndustry: string;
  competencyMapping: CompetencyMapEntry[];
  translatedBullets: TranslatedBulletEntry[];
  hardGaps: HardGapEntry[];
  superpowerPitch: string;
  beforeScore: number;
  afterScore: number;
}

/**
 * Coerces an AI-returned score to a clean 0-100 integer. Defaults to 0
 * rather than storing NaN or an out-of-range value if the model returns
 * something malformed - a wrong-but-plausible number is a smaller problem
 * than one that breaks the score bar's width or the animation below.
 */
function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function generatePivotAction(
  targetRole: string,
  targetIndustry: string,
): Promise<{ error?: string; pivot?: PivotData }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not logged in" };

  if (!targetRole.trim() || !targetIndustry.trim()) {
    return { error: "Please provide a target role and industry." };
  }

  // Fetch the user's current experience
  const profile = await prisma.careerProfile.findUnique({
    where: { userId: user.id },
    include: { experiences: true, skillEntries: true },
  });

  if (!profile || profile.experiences.length === 0) {
    return { error: "You need to add some experience to your Career Profile first before we can pivot it." };
  }

  const resumeText = profile.experiences
    .map((e) => `${e.title} at ${e.company}\n${e.description || ""}`)
    .join("\n\n");

  const skillsText = profile.skillEntries.map((s) => s.name).join(", ");

  const schema = {
    type: "object",
    properties: {
      competencyMapping: {
        type: "array",
        items: {
          type: "object",
          properties: {
            oldSkill: { type: "string", description: "A skill from their old industry" },
            newSkill: { type: "string", description: "The equivalent translated skill in the target industry" },
            explanation: { type: "string", description: "Short 1-sentence reason why they equate" },
          },
          required: ["oldSkill", "newSkill", "explanation"],
        },
        description: "Map 3-4 abstract competencies.",
      },
      translatedBullets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            original: { type: "string" },
            translated: { type: "string", description: "The bullet point rewritten using target industry vocabulary without hallucinating." },
          },
          required: ["original", "translated"],
        },
        description: "Rewrite 3 key bullet points.",
      },
      hardGaps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            missingSkill: { type: "string" },
            actionPlan: { type: "string", description: "1-sentence actionable step to acquire it." },
          },
          required: ["missingSkill", "actionPlan"],
        },
        description:
          "The real hard skills this candidate is missing for the target role and would need to learn. An empty array is the correct, expected answer when their background is already a strong match - never invent a gap just to fill this list.",
      },
      superpowerPitch: {
        type: "string",
        description:
          "A 2-sentence cover letter intro turning their unconventional background into a genuine advantage, grounded only in what's actually in their experience - never an invented accomplishment.",
      },
      beforeScore: {
        type: "number",
        description:
          "Your honest 0-100 estimate of how well this candidate's CURRENT resume language (before any translation) would read to a recruiter or ATS screening for the target role, judged strictly against this specific candidate's real overlap with it. Do not default to any particular range regardless of the candidate - someone already close to the target role can score high here; a genuinely unrelated background should score low.",
      },
      afterScore: {
        type: "number",
        description:
          "Your honest 0-100 estimate of how the resume would read after your translation. This should reflect genuinely better framing of real experience, not pretend hard gaps are closed - if hardGaps lists significant unmet requirements, do not inflate this number to imply they no longer matter.",
      },
    },
    required: ["competencyMapping", "translatedBullets", "hardGaps", "superpowerPitch", "beforeScore", "afterScore"],
  };

  try {
    const result = await aiProvider.complete({
      messages: [
        {
          role: "system",
          content:
            "You are an experienced career transition coach who is rigorously honest about a candidate's real prospects. Your job is to take a candidate's past experience and translate it into the vocabulary of their target role and industry, surfacing genuine transferable competencies. Do NOT hallucinate fake experience, skills, or employers - only translate what's actually there. Score honestly: never default to a flattering or dramatic-looking before/after gap regardless of the candidate. Someone whose background is already close to the target role should score high even before translation; someone with real, unclosed skill gaps should still score modestly after translation, because better framing does not manufacture missing experience. Be extremely specific and grounded in this candidate's actual history throughout.",
        },
        {
          role: "user",
          content: `Target Role: ${targetRole}\nTarget Industry: ${targetIndustry}\n\nCurrent Experience:\n${resumeText}\n\nCurrent Skills:\n${skillsText}`,
        },
      ],
      responseSchema: schema,
      temperature: 0.3,
    });

    if (!result.parsed) throw new Error("Failed to parse AI pivot output.");

    const parsed = result.parsed as Partial<{
      competencyMapping: CompetencyMapEntry[];
      translatedBullets: TranslatedBulletEntry[];
      hardGaps: HardGapEntry[];
      superpowerPitch: string;
      beforeScore: number;
      afterScore: number;
    }>;

    const competencyMapping = Array.isArray(parsed.competencyMapping) ? parsed.competencyMapping : [];
    const translatedBullets = Array.isArray(parsed.translatedBullets) ? parsed.translatedBullets : [];
    const hardGaps = Array.isArray(parsed.hardGaps) ? parsed.hardGaps : [];
    const superpowerPitch = typeof parsed.superpowerPitch === "string" ? parsed.superpowerPitch : "";

    // A model that ignored the schema (or returned an unparseable/empty
    // response) shouldn't silently save an empty strategy that then renders
    // as a near-blank page - report it honestly instead, the same way
    // resume parsing falls back when extraction comes back with nothing
    // usable (see lib/ai/providers/resume-ai.ts).
    const gotAnything =
      competencyMapping.length > 0 || translatedBullets.length > 0 || hardGaps.length > 0 || superpowerPitch.length > 0;
    if (!gotAnything) {
      return { error: "Couldn't generate a transition strategy from your profile right now. Please try again." };
    }

    const beforeScore = clampScore(parsed.beforeScore);
    const afterScore = clampScore(parsed.afterScore);

    // Save to database
    const saved = await prisma.careerPivot.upsert({
      where: { userId: user.id },
      update: {
        targetRole,
        targetIndustry,
        competencyMapping: competencyMapping as any,
        translatedBullets: translatedBullets as any,
        hardGaps: hardGaps as any,
        superpowerPitch,
        beforeScore,
        afterScore,
      },
      create: {
        userId: user.id,
        targetRole,
        targetIndustry,
        competencyMapping: competencyMapping as any,
        translatedBullets: translatedBullets as any,
        hardGaps: hardGaps as any,
        superpowerPitch,
        beforeScore,
        afterScore,
      },
    });

    revalidatePath("/career-pivot");
    return {
      pivot: {
        id: saved.id,
        targetRole,
        targetIndustry,
        competencyMapping: competencyMapping as any,
        translatedBullets: translatedBullets as any,
        hardGaps: hardGaps as any,
        superpowerPitch,
        beforeScore,
        afterScore,
      },
    };
  } catch (error) {
    console.error("Pivot engine error:", error);
    return { error: "Failed to generate pivot strategy. Please try again." };
  }
}

export async function getPivotAction(): Promise<PivotData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const pivot = await prisma.careerPivot.findUnique({ where: { userId: user.id } });
  if (!pivot) return null;

  return {
    id: pivot.id,
    targetRole: pivot.targetRole,
    targetIndustry: pivot.targetIndustry,
    competencyMapping: (pivot.competencyMapping as unknown as CompetencyMapEntry[] | null) ?? [],
    translatedBullets: (pivot.translatedBullets as unknown as TranslatedBulletEntry[] | null) ?? [],
    hardGaps: (pivot.hardGaps as unknown as HardGapEntry[] | null) ?? [],
    superpowerPitch: pivot.superpowerPitch ?? "",
    beforeScore: pivot.beforeScore ?? 0,
    afterScore: pivot.afterScore ?? 0,
  };
}
