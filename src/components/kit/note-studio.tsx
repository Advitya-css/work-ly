"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Mail, RefreshCw, Send, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateOutreachEmailAction, type HiringManagerNote } from "@/lib/opportunities/pro-actions";
import { CopyButton } from "@/components/opportunities/tool-dialog";
import { savedLabel, useSavedTool } from "@/components/opportunities/use-saved-tool";
import { InspectorSection, KitLabel, Studio } from "@/components/kit/kit-parts";
import { WritingError, WritingState } from "@/components/kit/writing-state";
import { cn } from "@/lib/utils";

/** Results saved before the note gained a subject, a LinkedIn version or a follow-up. */
function normalise(data: Partial<HiringManagerNote> | null): HiringManagerNote | null {
  if (!data?.email) return null;
  return {
    email: data.email,
    subject: data.subject ?? null,
    connectionNote: data.connectionNote ?? null,
    whoToFind: data.whoToFind ?? null,
    followUp: data.followUp ?? null,
    unverifiedNumbers: data.unverifiedNumbers ?? [],
  };
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

/** A message window: a label strip on top, the editable text below. */
function MessageCard({
  icon,
  label,
  meta,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground">
          {icon}
          {label}
        </span>
        {meta}
      </div>
      {children}
    </section>
  );
}

const fieldClass =
  "w-full resize-none bg-transparent px-5 py-4 text-[14.5px] leading-7 text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground";

/**
 * The note to the person who'd manage this role, three ways: an email, a
 * LinkedIn request that fits LinkedIn's limit, and a follow-up for when
 * there's no reply. Plus who to send it to and a search that finds them.
 */
export function NoteStudio({ opportunityId, company }: { opportunityId: string; company: string | null }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const tool = useSavedTool<HiringManagerNote>("note", opportunityId, async () => {
    const res = await generateOutreachEmailAction(opportunityId);
    if (!("error" in res)) router.refresh();
    return "error" in res ? { error: res.error } : { data: res.data, savedAt: res.savedAt };
  });

  useEffect(() => {
    void tool.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tool.phase === "idle" || tool.phase === "checking" || tool.phase === "generating") {
    return (
      <WritingState
        paper={false}
        lines={12}
        steps={["Reading the job", "Working out who'd manage this role", "Finding your strongest proof for it", "Writing the email, the LinkedIn note and a follow-up"]}
      />
    );
  }
  const note = normalise(tool.data);
  if (tool.phase === "error" || !note) {
    return <WritingError message={tool.error ?? "Couldn't write the note just now."} onRetry={() => void tool.regenerate()} />;
  }

  const firstTitle = note.whoToFind?.split(/\s+or\s+/i)[0]?.trim();
  const searchUrl =
    firstTitle && company
      ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${firstTitle} ${company}`)}`
      : null;
  const emailText = note.subject ? `Subject: ${note.subject}\n\n${note.email}` : note.email;
  const noteLength = note.connectionNote?.length ?? 0;

  return (
    <Studio
      document={
        <div className="flex flex-col gap-4">
          <MessageCard icon={<Mail className="size-4 text-primary" />} label="Email" meta={<CopyButton text={emailText} label="Copy" variant="ghost" size="sm" />}>
            <div className="flex items-center gap-3 border-b border-border px-5 py-2.5 text-[13px]">
              <span className="w-14 shrink-0 text-muted-foreground">To</span>
              <span className="truncate text-foreground">
                {note.whoToFind ?? "The hiring manager"}
                {company && <span className="text-muted-foreground"> at {company}</span>}
              </span>
            </div>
            <label className="flex items-center gap-3 border-b border-border px-5 py-2.5 text-[13px]">
              <span className="w-14 shrink-0 text-muted-foreground">Subject</span>
              <input
                value={note.subject ?? ""}
                onChange={(e) => tool.edit({ subject: e.target.value })}
                className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none"
              />
            </label>
            <textarea aria-label="Email" value={note.email} onChange={(e) => tool.edit({ email: e.target.value })} className={cn(fieldClass, "min-h-[220px]")} />
          </MessageCard>

          {note.connectionNote !== null && (
            <MessageCard
              icon={<LinkedInIcon className="size-4 text-[#0a66c2]" />}
              label="LinkedIn connection request"
              meta={
                <span className="flex items-center gap-2">
                  <span className={cn("font-mono text-[11.5px] tabular-nums", noteLength > 280 ? "text-warning" : "text-muted-foreground")}>
                    {noteLength}/300
                  </span>
                  <CopyButton text={note.connectionNote} label="Copy" variant="ghost" size="sm" />
                </span>
              }
            >
              <textarea
                aria-label="LinkedIn connection note"
                value={note.connectionNote}
                maxLength={300}
                onChange={(e) => tool.edit({ connectionNote: e.target.value })}
                className={cn(fieldClass, "min-h-[110px]")}
              />
            </MessageCard>
          )}

          {note.followUp && (
            <MessageCard
              icon={<Send className="size-4 text-primary" />}
              label="Follow-up, if there's no reply in a week"
              meta={<CopyButton text={note.followUp} label="Copy" variant="ghost" size="sm" />}
            >
              <textarea aria-label="Follow-up" value={note.followUp} onChange={(e) => tool.edit({ followUp: e.target.value })} className={cn(fieldClass, "min-h-[120px]")} />
            </MessageCard>
          )}
        </div>
      }
      inspector={
        <>
          <InspectorSection title="Who to send it to">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserRound className="size-4" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-[13.5px] font-medium text-foreground">{note.whoToFind ?? "The hiring manager"}</span>
                {company && <span className="text-[12.5px] text-muted-foreground">at {company}</span>}
              </div>
            </div>
            {searchUrl && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                  <LinkedInIcon className="size-3.5 text-[#0a66c2]" />
                  Find them on LinkedIn
                  <ExternalLink className="size-3 text-muted-foreground" aria-hidden />
                </a>
              </Button>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Send the LinkedIn request first. If they accept, the email is your follow-on message.
            </p>
          </InspectorSection>

          {note.unverifiedNumbers.length > 0 && (
            <InspectorSection className="border-warning/40">
              <p className="flex gap-2 text-[12.5px] leading-snug text-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                <span>
                  Check <span className="font-medium">{note.unverifiedNumbers.join(", ")}</span>. They aren&apos;t on your
                  profile, so keep them only if they&apos;re true.
                </span>
              </p>
            </InspectorSection>
          )}

          <InspectorSection>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {savedLabel(tool.saveState, tool.edited, tool.savedAt) || "Click any message to edit it."}
            </p>
            {confirming ? (
              <div className="flex flex-col gap-2 text-[13px]">
                <span>{tool.edited ? "This replaces your edits. Rewrite?" : "Write a new version?"}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setConfirming(false);
                      void tool.regenerate();
                    }}
                  >
                    Yes, rewrite
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirming(true)}>
                <RefreshCw className="size-3.5" />
                Write a new version
              </Button>
            )}
          </InspectorSection>

          <div className="px-1">
            <KitLabel>Rule it follows</KitLabel>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              One real proof, matched to something this posting needs, and a small ask. No flattery, nothing you
              haven&apos;t done.
            </p>
          </div>
        </>
      }
    />
  );
}
