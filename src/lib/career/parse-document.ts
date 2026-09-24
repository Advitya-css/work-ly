import "server-only";
import { creditReferralOnActivation } from "@/lib/db/users";
import { UserFacingError } from "@/lib/errors";

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
import { replaceCandidateValues } from "@/lib/db/candidate-values";
import { storageProvider } from "@/lib/storage";

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!v || /^(present|current|now|ongoing|till date|to date)$/i.test(v)) return null;
  // "2016" or "2016-09": pin to the middle of the day in UTC so the stored
  // month never drifts a day backwards into the previous month/year in a
  // negative-offset timezone.
  const ym = /^(\d{4})(?:-(\d{1,2}))?$/.exec(v);
  if (ym) {
    const month = ym[2] ? Math.min(12, Math.max(1, Number(ym[2]))) - 1 : 0;
    return new Date(Date.UTC(Number(ym[1]), month, 1, 12));
  }
  const parsed = new Date(v);
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
    workValues: number;
  };
}

/**
 * A skill's evidence level, decided from the resume itself rather than
 * taken on the model's word. The model used to label skills DEMONSTRATED
 * or CERTIFIED freely, and those labels decide how much a match counts in
 * scoring. Now: CERTIFIED only when a certification on the resume names
 * it, DEMONSTRATED only when a role, project or achievement description
 * uses it, otherwise STATED.
 */
function evidenceFromText(
  skillName: string,
  extraction: {
    certifications: { name: string; issuer?: string | null }[];
    experience: { title: string; description?: string | null }[];
    projects: { name: string; description?: string | null }[];
    achievements: { title: string; description?: string | null }[];
  },
): "STATED" | "DEMONSTRATED" | "CERTIFIED" {
  const pattern = skillPattern(skillName);
  if (!pattern) return "STATED";
  if (extraction.certifications.some((c) => pattern.test(`${c.name} ${c.issuer ?? ""}`))) return "CERTIFIED";
  const used = [
    ...extraction.experience.map((e) => `${e.title} ${e.description ?? ""}`),
    ...extraction.projects.map((p) => `${p.name} ${p.description ?? ""}`),
    ...extraction.achievements.map((a) => `${a.title} ${a.description ?? ""}`),
  ];
  return used.some((t) => pattern.test(t)) ? "DEMONSTRATED" : "STATED";
}

function skillPattern(name: string): RegExp | null {
  const trimmed = name.trim();
  if (trimmed.length < 1) return null;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Symbols like C++ / C# / .NET break \b, so use explicit non-word guards.
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu");
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
  // Resume extraction is one of only two paths in Work-ly that actually
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
        workValues: 0,
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
      throw new UserFacingError(authenticity.message);
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
      // Field name and length only, never the value itself: `d.value` here
      // is the user's own resume content (a name, an employer, an email) -
      // logging it verbatim would put PII into server logs for every CV
      // that trips this gate.
      console.warn(
        `[workly:grounding] dropped ${groundingReport.dropped.length} unverifiable claim(s) from a CV extraction ` +
          `(grounded ${Math.round(groundingReport.groundedRatio * 100)}%): ` +
          groundingReport.dropped
            .slice(0, 8)
            .map((d) => `${d.field}(len=${String(d.value ?? "").length})`)
            .join(", "),
      );
    }
    const profile = await getOrCreateCareerProfile(userId);

    // Fill headline/summary only if the user hasn't already set their own -
    // CV-derived text never overwrites a fact the user entered themselves.
    // Same rule for years of experience: leaving it unset made every fit
    // score report "You have 0 years of experience" straight after a CV
    // listing seven years of work had been read successfully.
    //
    // Both merge into ONE upsertCareerProfile call carrying every field's
    // current value. upsertCareerProfile is a documented whole-row
    // overwrite (a field a caller omits is treated as a deliberate clear),
    // so two separate partial calls here used to clobber each other -
    // whichever ran second wiped location/currentRole/currentCompany/skills
    // back to null, and if both conditions below were true in the same
    // parse, the second call also erased the headline/summary the first
    // call had just written.
    const nextHeadline = !profile.headline && !profile.summary && extraction.headline ? extraction.headline : profile.headline;
    const nextSummary = !profile.headline && !profile.summary && extraction.summary ? extraction.summary : profile.summary;
    const nextYearsExperience =
      profile.yearsExperience == null && extraction.yearsExperience != null
        ? extraction.yearsExperience
        : profile.yearsExperience;

    // Same fill-only-blanks rule for where they live and what they do now:
    // a CV that says "Bengaluru" and lists a current role used to leave
    // Home location, Current role and Current company empty, so location
    // matching and every "your current role" prompt started from nothing.
    const currentExperience = extraction.experience.find((e) => e.isCurrent && e.title && e.company);
    const nextLocation = profile.location || extraction.location?.trim() || null;
    const nextCurrentRole = profile.currentRole || currentExperience?.title || null;
    const nextCurrentCompany = profile.currentCompany || currentExperience?.company || null;

    if (
      nextHeadline !== profile.headline ||
      nextSummary !== profile.summary ||
      nextYearsExperience !== profile.yearsExperience ||
      nextLocation !== profile.location ||
      nextCurrentRole !== profile.currentRole ||
      nextCurrentCompany !== profile.currentCompany
    ) {
      await upsertCareerProfile(userId, {
        headline: nextHeadline,
        summary: nextSummary,
        location: nextLocation,
        currentRole: nextCurrentRole,
        currentCompany: nextCurrentCompany,
        yearsExperience: nextYearsExperience,
        skills: profile.skills,
      });
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
          evidenceLevel: evidenceFromText(s.name, extraction),
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

    // Replaces rather than adds - see replaceCandidateValues for why a
    // fresh parse supersedes the previous inference instead of piling on.
    await replaceCandidateValues(
      profile.id,
      extraction.workValues.map((v) => ({
        value: v.value,
        confidence: v.confidence,
        evidence: v.evidence,
        source: "AI_INFERENCE" as const,
      })),
    );

    await updateDocumentStatus(documentId, "PARSED");

    // Activation: a referred user's first real resume unlocks both
    // referral rewards (once). Never allowed to fail the parse.
    try {
      await creditReferralOnActivation(userId);
    } catch (error) {
      console.warn("[workly:referral] credit failed:", error instanceof Error ? error.message : error);
    }

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
        workValues: extraction.workValues.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parsing failed.";
    await updateDocumentStatus(documentId, "FAILED", message);
    throw error;
  }
}
