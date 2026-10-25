"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, Lock, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateOutreachEmailAction, type HiringManagerNote } from "@/lib/opportunities/pro-actions";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { SavedLockedPreview } from "@/components/paywall/saved-locked-preview";
import { ProPreview } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";
import { CopyButton, ToolDialog } from "@/components/opportunities/tool-dialog";
import { savedLabel, useSavedTool } from "@/components/opportunities/use-saved-tool";
import { cn } from "@/lib/utils";

/** Results saved before the note gained a subject and a LinkedIn version only had `email`. */
function normalise(data: Partial<HiringManagerNote> | null): HiringManagerNote | null {
  if (!data?.email) return null;
  return {
    email: data.email,
    subject: data.subject ?? null,
    connectionNote: data.connectionNote ?? null,
    whoToFind: data.whoToFind ?? null,
    unverifiedNumbers: data.unverifiedNumbers ?? [],
  };
}

/**
 * A short note to the person who'd manage this role, as an email and as a
 * LinkedIn connection request, plus who to look for and a search that
 * finds them.
 */
export function InsiderAccessButton({
  opportunityId,
  isPro = false,
  preview,
  label,
  lockedLabel,
  savedPreview,
  company,
}: {
  opportunityId: string;
  isPro?: boolean;
  preview?: PreviewData;
  /** Button text override, e.g. a shorter label inside a tool tile. */
  label?: string;
  lockedLabel?: string;
  /** First words of what was saved for this job before Pro ended, shown locked. */
  savedPreview?: string | null;
  /** For the "find them on LinkedIn" search. */
  company?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("email");
  const tool = useSavedTool<HiringManagerNote>("note", opportunityId, async () => {
    const res = await generateOutreachEmailAction(opportunityId);
    return "error" in res ? { error: res.error } : { data: res.data, savedAt: res.savedAt };
  });

  if (!isPro) {
    if (savedPreview) {
      return (
        <UpgradeModal
          title="Your note to the hiring manager is saved"
          description="It's still in your account. Pro opens it again, lets you edit and download it, and writes one for every job you apply to."
          defaultPlan="quarterly"
          preview={<SavedLockedPreview label="Saved for this job: your note" visible={savedPreview} />}
        >
          <Button variant="outline" className="w-full gap-2 sm:w-auto">
            <Lock className="size-4" />
            {lockedLabel ?? "Saved"} · saved
          </Button>
        </UpgradeModal>
      );
    }
    return (
      <UpgradeModal
        title="Unlock hiring manager messages"
        description="A short, specific note to the person who'll actually decide, as an email and a LinkedIn request, so you're not one more resume in the pile."
        preview={
          preview && (
            <ProPreview
              facts={[{ label: "It would open with what you bring", items: preview.strengths }]}
              outputLabel="Your message, ready to send on email or LinkedIn"
              lines={3}
            />
          )
        }
      >
        <Button variant="outline" className="w-full gap-2 sm:w-auto">
          <Lock className="size-4" />
          {lockedLabel ?? "Message the hiring manager (Pro)"}
        </Button>
      </UpgradeModal>
    );
  }

  const note = normalise(tool.data);
  const firstTitle = note?.whoToFind?.split(/\s+or\s+/i)[0]?.trim();
  const searchUrl =
    firstTitle && company
      ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${firstTitle} ${company}`)}`
      : null;
  const emailText = note ? (note.subject ? `Subject: ${note.subject}\n\n${note.email}` : note.email) : "";
  const noteLength = note?.connectionNote?.length ?? 0;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
          void tool.open();
        }}
        className="w-full gap-2 sm:w-auto"
      >
        <UserPlus className="size-4" />
        {label ?? "Message the hiring manager"}
      </Button>

      <ToolDialog
        open={open}
        onOpenChange={setOpen}
        title="Note to the hiring manager"
        description="Short and specific, built on one real proof. Edit anything; your changes are saved."
        phase={tool.phase}
        error={tool.error}
        steps={["Reading the job", "Working out who'd manage this role", "Finding your strongest proof for it", "Writing the email and the LinkedIn note"]}
        edited={tool.edited}
        status={savedLabel(tool.saveState, tool.edited, tool.savedAt)}
        onRegenerate={() => void tool.regenerate()}
        actions={
          note &&
          (tab === "linkedin" && note.connectionNote ? (
            <CopyButton text={note.connectionNote} label="Copy note" />
          ) : (
            <CopyButton text={emailText} label="Copy email" />
          ))
        }
      >
        {note && (
          <div className="flex flex-col gap-4">
            {note.whoToFind && (
              <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  <span className="text-muted-foreground">Send it to the </span>
                  <span className="font-medium text-foreground">{note.whoToFind}</span>
                  {company && <span className="text-muted-foreground"> at {company}</span>}
                </p>
                {searchUrl && (
                  <a
                    href={searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Find them on LinkedIn
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
            )}

            {note.unverifiedNumbers.length > 0 && (
              <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                <span>
                  Check <span className="font-medium">{note.unverifiedNumbers.join(", ")}</span>. They aren&apos;t on your
                  profile, so keep them only if they&apos;re true.
                </span>
              </p>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-fit">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="linkedin" disabled={!note.connectionNote}>
                  LinkedIn request
                </TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="flex flex-col gap-3 pt-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Subject
                  <Input
                    value={note.subject ?? ""}
                    onChange={(e) => tool.edit({ subject: e.target.value })}
                    className="text-sm font-normal text-foreground"
                  />
                </label>
                <Textarea
                  aria-label="Email"
                  value={note.email}
                  onChange={(e) => tool.edit({ email: e.target.value })}
                  className="min-h-[220px] resize-none border-border bg-background px-4 py-3 text-[15px] leading-7 shadow-none"
                />
              </TabsContent>
              <TabsContent value="linkedin" className="flex flex-col gap-2 pt-2">
                <Textarea
                  aria-label="LinkedIn connection note"
                  value={note.connectionNote ?? ""}
                  maxLength={300}
                  onChange={(e) => tool.edit({ connectionNote: e.target.value })}
                  className="min-h-[140px] resize-none border-border bg-background px-4 py-3 text-[15px] leading-7 shadow-none"
                />
                <p className={cn("text-right text-xs tabular-nums", noteLength > 280 ? "text-warning" : "text-muted-foreground")}>
                  {noteLength}/300 characters
                </p>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </ToolDialog>
    </>
  );
}
