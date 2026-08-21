import "server-only";

import { extractDocumentText } from "@/lib/ai/document-text";
import { resumeParsingProvider } from "@/lib/ai/resume-parser";
import { checkAuthenticity } from "@/lib/validation/document-authenticity";
import { groundResumeExtraction } from "@/lib/ai/grounding";
import type { ExtractedCareerProfile } from "@/lib/ai/resume-parser-types";
import { getDocumentById, updateDocumentStatus } from "@/lib/db/documents";
import { getOrCreateCareerProfile, upsertCareerProfile } from "@/lib/db/career-profile";
import { createEducation } from "@/lib/db/education";
import { createExperience } from "@/lib/db/experience";
import { createProject } from "@/lib/db/projects";
import { createSkill } from "@/lib/db/skills";
import { createAchievement } from "@/lib/db/achievements";
import { createCertification } from "@/lib/db/certifications";
import { storageProvider } from "@/lib/storage";

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface ParseDocumentResult {
  /** True when the document had already been parsed and nothing was re-run. */
  alreadyParsed?: boolean;
  /** Null only when `alreadyParsed` is true. */
  extraction: ExtractedCareerProfile | null;
  counts: {
    education: number;
    experience: number;
    projects: number;
    skills: number;
    achievements: number;
    certifications: number;
    transferableSkills: number;
  };
}

/**
 * The full CV ingestion pipeline for one document: extract text, run it
 * through the resume parser (real AI or heuristic fallback - the caller
 * doesn't need to know which), and persist every entry as its own row,
 * tagged with source + isUncertain. Nothing here overwrites a fact the
 * user already entered by hand.
 */
export async function parseDocumentAndBuildProfile(
  documentId: string,
  userId: string,
  options: { force?: boolean } = {},
): Promise<ParseDocumentResult> {
  const document = await getDocumentById(userId, documentId);
  if (!document || document.userId !== userId) {
    throw new Error("Document not found.");
  }

  // COST CONTROL: never re-run extraction on a document already parsed.
  //
  // Resume extraction is one of only two paths in Workly that actually
  // calls a model, and it's the expensive one - a whole CV is a large
  // prompt. Without this guard, a double-clicked button, a retried request
  // or a refreshed tab each bought another call AND appended a second copy
  // of every education, experience and skill row to the profile. The
  // duplicate-data bug was arguably worse than the cost.
  //
  // `force` exists for a deliberate re-parse, e.g. after re-uploading.
  if (document.status === "PARSED" && !options.force) {
    return {
      alreadyParsed: true,
      extraction: null,
      counts: {
        education: 0,
        experience: 0,
        projects: 0,
        skills: 0,
        achievements: 0,
        certifications: 0,
        transferableSkills: 0,
      },
    };
  }

  await updateDocumentStatus(documentId, "PARSING");

  try {
    const fileBytes = await storageProvider.download(document.storageKey);
    const text = await extractDocumentText(fileBytes, document.fileType);

    if (!text || text.trim().length < 20) {
      throw new Error(
        "Couldn't read any meaningful text from this file. It may be a scanned image rather than selectable text.",
      );
    }

    // GATE ONE: is this actually a CV?
    //
    // Without this, uploading a shopping list produced a career profile,
    // and every score computed against it was then presented as a fact
    // about the person. Refusing is the honest outcome: a profile built
    // from the wrong document is worse than no profile, because it looks
    // exactly as authoritative as a real one.
    const authenticity = checkAuthenticity(text, "resume");
    if (authenticity.verdict === "reject") {
      throw new Error(authenticity.message);
    }

    const rawExtraction = await resumeParsingProvider.extractCareerProfile(text);

    // GATE TWO: did the model invent anything?
    //
    // An AI extraction can hallucinate an employer, a degree or a skill
    // that appears nowhere in the document. Those would enter the profile
    // indistinguishable from real facts and then be scored. Every claim is
    // checked back against the source text and anything unfindable is
    // dropped rather than stored.
    const groundingReport = groundResumeExtraction(rawExtraction, text);
    const extraction = groundingReport.grounded;

    if (groundingReport.dropped.length > 0) {
      console.warn(
        `[workly:grounding] dropped ${groundingReport.dropped.length} unverifiable claim(s) from a CV extraction ` +
          `(grounded ${Math.round(groundingReport.groundedRatio * 100)}%): ` +
          groundingReport.dropped.slice(0, 8).map((d) => `${d.field}="${d.value}"`).join(", "),
      );
    }
    const profile = await getOrCreateCareerProfile(userId);

    // Fill headline/summary only if the user hasn't already set their own -
    // CV-derived text never overwrites a fact the user entered themselves.
    if ((extraction.headline || extraction.summary) && !profile.headline && !profile.summary) {
      await upsertCareerProfile(userId, {
        headline: extraction.headline || profile.headline,
        summary: extraction.summary || profile.summary,
      });
    }

    // Same rule for years of experience. Leaving this unset made every fit
    // score report "You have 0 years of experience" straight after a CV
    // listing seven years of work had been read successfully.
    if (extraction.yearsExperience != null && profile.yearsExperience == null) {
      await upsertCareerProfile(userId, { yearsExperience: extraction.yearsExperience });
    }

    await Promise.all([
      ...extraction.education.map((e) =>
        createEducation(profile.id, {
          institution: e.institution,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          startDate: parseDate(e.startDate),
          endDate: parseDate(e.endDate),
          description: e.description,
          source: "CV",
          isUncertain: e.isUncertain,
        }),
      ),
      ...extraction.experience.map((e) =>
        createExperience(profile.id, {
          company: e.company,
          title: e.title,
          location: e.location,
          startDate: parseDate(e.startDate),
          endDate: parseDate(e.endDate),
          isCurrent: e.isCurrent ?? false,
          description: e.description,
          source: "CV",
          isUncertain: e.isUncertain,
        }),
      ),
      ...extraction.projects.map((p) =>
        createProject(profile.id, {
          name: p.name,
          role: p.role,
          description: p.description,
          url: p.url,
          startDate: parseDate(p.startDate),
          endDate: parseDate(p.endDate),
          source: "CV",
          isUncertain: p.isUncertain,
        }),
      ),
      ...extraction.skills.map((s) =>
        createSkill(profile.id, {
          name: s.name,
          category: s.category,
          evidenceLevel: s.evidenceLevel,
          source: "CV",
          recency: "UNKNOWN",
        }),
      ),
      ...extraction.achievements.map((a) =>
        createAchievement(profile.id, {
          title: a.title,
          description: a.description,
          date: parseDate(a.date),
          source: "CV",
          isUncertain: a.isUncertain,
        }),
      ),
      ...extraction.certifications.map((c) =>
        createCertification(profile.id, {
          name: c.name,
          issuer: c.issuer,
          issueDate: parseDate(c.issueDate),
          expiryDate: parseDate(c.expiryDate),
          source: "CV",
          isUncertain: c.isUncertain,
        }),
      ),
      // Transferable skills are never stated facts - always AI_INFERENCE,
      // always isTransferable: true, always carrying the rationale so the
      // UI can show *why* it was suggested.
      ...extraction.transferableSkills.map((t) =>
        createSkill(profile.id, {
          name: t.name,
          category: t.category,
          evidenceLevel: "INFERRED",
          source: "AI_INFERENCE",
          recency: "UNKNOWN",
          isTransferable: true,
          transferableRationale: t.rationale,
        }),
      ),
    ]);

    await updateDocumentStatus(documentId, "PARSED");

    return {
      extraction,
      counts: {
        education: extraction.education.length,
        experience: extraction.experience.length,
        projects: extraction.projects.length,
        skills: extraction.skills.length,
        achievements: extraction.achievements.length,
        certifications: extraction.certifications.length,
        transferableSkills: extraction.transferableSkills.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parsing failed.";
    await updateDocumentStatus(documentId, "FAILED", message);
    throw error;
  }
}
