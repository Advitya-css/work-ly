import type { Experience, GapItem } from "@/lib/db/types";

/**
 * The real, specific facts a locked Pro tool's preview shows (see
 * components/guidance/pro-preview.tsx). Everything here is copied from the
 * user's own profile or from the job/analysis Work-ly already stored -
 * nothing is generated - so the preview can never promise something the
 * tool won't do.
 */
export interface PreviewData {
  keywords: string[];
  strengths: string[];
  gaps: string[];
  latestRole: string | null;
  latestRoleLines: number;
  roleCount: number;
}

function clip(text: string, max = 60): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

function lineCount(description: string | null): number {
  if (!description) return 0;
  return description
    .split(/\n|•|(?:^|\s)[-*]\s/)
    .map((l) => l.trim())
    .filter((l) => l.length > 12).length;
}

export function buildPreviewData(input: {
  requiredSkills?: string[] | null;
  preferredSkills?: string[] | null;
  strengths?: string[] | null;
  gaps?: GapItem[] | null;
  weaknesses?: string[] | null;
  experiences?: Pick<Experience, "title" | "company" | "description" | "isCurrent" | "startDate">[] | null;
}): PreviewData {
  const keywords = unique([...(input.requiredSkills ?? []), ...(input.preferredSkills ?? [])])
    .map((k) => clip(k, 32))
    .slice(0, 8);

  const strengths = unique(input.strengths ?? []).map((s) => clip(s)).slice(0, 3);

  const gapTitles = (input.gaps ?? []).map((g) => g.title).filter(Boolean);
  const gaps = unique(gapTitles.length ? gapTitles : input.weaknesses ?? [])
    .map((g) => clip(g))
    .slice(0, 3);

  const experiences = [...(input.experiences ?? [])].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime();
  });
  const latest = experiences[0] ?? null;

  return {
    keywords,
    strengths,
    gaps,
    latestRole: latest ? `${latest.title}${latest.company ? ` at ${latest.company}` : ""}` : null,
    latestRoleLines: latest ? lineCount(latest.description) : 0,
    roleCount: experiences.length,
  };
}
