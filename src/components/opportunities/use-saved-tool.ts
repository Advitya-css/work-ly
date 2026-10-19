"use client";

import { useEffect, useRef, useState } from "react";

import { loadSavedToolAction, saveToolEditsAction } from "@/lib/opportunities/saved-tool-actions";

type Generated<T> = { data?: T; savedAt?: string | null; error?: string };
export type ToolPhase = "idle" | "checking" | "generating" | "ready" | "error";
export type EditSaveState = "idle" | "saving" | "saved" | "error";

/**
 * Shared behaviour for the Pro writing tools on a job (cover letter, note to
 * the hiring manager, interview questions):
 *
 *   - opening shows what was already written for this job, instantly;
 *   - only the first open (or "Write a new version") spends an AI call;
 *   - edits are saved as you type, so the draft you polished is still
 *     there tomorrow.
 */
export function useSavedTool<T>(
  kind: "cover" | "note" | "interview",
  opportunityId: string,
  generate: () => Promise<Generated<T>>,
) {
  const [data, setData] = useState<T | null>(null);
  const [phase, setPhase] = useState<ToolPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [edited, setEdited] = useState(false);
  const [saveState, setSaveState] = useState<EditSaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function run() {
    setPhase("generating");
    setError(null);
    try {
      const res = await generate();
      if (res.error || !res.data) {
        setError(res.error ?? "Couldn't write this right now. Please try again.");
        setPhase("error");
        return;
      }
      setData(res.data);
      setSavedAt(res.savedAt ?? null);
      setEdited(false);
      setSaveState("idle");
      setPhase("ready");
    } catch {
      setError("Network problem. Check your connection and try again.");
      setPhase("error");
    }
  }

  /** Called when the dialog opens: show the saved version, or write the first one. */
  async function open() {
    if (data || phase === "checking" || phase === "generating") return;
    setPhase("checking");
    const saved = await loadSavedToolAction(kind, opportunityId).catch(() => null);
    if (saved) {
      setData(saved.data as T);
      setSavedAt(saved.savedAt);
      setEdited(saved.edited);
      setPhase("ready");
      return;
    }
    await run();
  }

  /** Keep a local edit and save it shortly after typing stops. */
  function edit(patch: Partial<T>) {
    if (kind === "interview") return;
    setData((current) => (current ? { ...current, ...patch } : current));
    setEdited(true);
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await saveToolEditsAction(kind, opportunityId, patch as Record<string, unknown>);
        if ("error" in res) setSaveState("error");
        else {
          setSaveState("saved");
          setSavedAt(res.savedAt);
        }
      } catch {
        setSaveState("error");
      }
    }, 800);
  }

  return { data, phase, error, savedAt, edited, saveState, open, regenerate: run, edit };
}

export function savedLabel(state: EditSaveState, edited: boolean, savedAt: string | null): string {
  if (state === "saving") return "Saving…";
  if (state === "error") return "Couldn't save your last edit.";
  if (!savedAt) return edited ? "Edited" : "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(savedAt).getTime()) / 60000));
  const when =
    minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.round(minutes / 60)} h ago` : `${Math.round(minutes / 1440)} d ago`;
  return edited ? `Your edits are saved · ${when}` : `Saved · written ${when}`;
}
