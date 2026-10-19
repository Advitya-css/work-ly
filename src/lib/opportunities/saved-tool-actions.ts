"use server";

import { getCurrentUser } from "@/lib/auth";
import { getSavedOutput, saveOutput, type SavedKind } from "@/lib/saved-outputs";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";

/**
 * Reading back what a Pro tool already wrote for a job, and saving the
 * user's edits to it. Opening the cover letter a second time should show
 * the same letter, with your changes, instantly, not write a new one.
 */

type ToolKind = Extract<SavedKind, "cover" | "note" | "interview">;
const KINDS: ToolKind[] = ["cover", "note", "interview"];

export async function loadSavedToolAction(
  kind: ToolKind,
  opportunityId: string,
): Promise<{ data: unknown; savedAt: string; edited: boolean } | null> {
  if (!KINDS.includes(kind)) return null;
  const user = await getCurrentUser();
  if (!user?.isPro) return null;
  const saved = await getSavedOutput<unknown>(user.id, kind, opportunityId);
  return saved ? { data: saved.data, savedAt: saved.savedAt, edited: Boolean(saved.edited) } : null;
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.replace(/\r\n/g, "\n").trim().slice(0, max) : null;
}

/** Only the editable text fields are taken from the browser; everything else comes from the saved copy. */
export async function saveToolEditsAction(
  kind: "cover" | "note",
  opportunityId: string,
  fields: Record<string, unknown>,
): Promise<{ savedAt: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!user.isPro) return { error: "This is a Pro feature." };
  const opp = await getOpportunityWithJobById(user.id, opportunityId);
  if (!opp || opp.userId !== user.id) return { error: "Opportunity not found." };

  const saved = await getSavedOutput<Record<string, unknown>>(user.id, kind, opportunityId);
  if (!saved) return { error: "Nothing to save yet." };
  const next = { ...saved.data };
  if (kind === "cover") {
    const letter = text(fields.coverLetter, 6000);
    if (!letter) return { error: "The letter is empty." };
    next.coverLetter = letter;
  } else {
    for (const [key, max] of [
      ["email", 3000],
      ["subject", 200],
      ["connectionNote", 300],
    ] as const) {
      if (key in fields) next[key] = text(fields[key], max);
    }
  }
  const savedAt = await saveOutput(user.id, kind, opportunityId, next, { edited: true });
  return savedAt ? { savedAt } : { error: "Couldn't save your edits. Copy them somewhere safe and try again." };
}
