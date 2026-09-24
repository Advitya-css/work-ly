"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Download, FileText, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { generateTailoredResumeDocAction } from "@/lib/resume/actions";
import type { TailoredResume } from "@/lib/resume/tailored-resume";

interface Candidate {
  name: string;
  email: string;
  location: string | null;
  headline: string | null;
}

/**
 * The resume preview is a document, not app UI: it stays black-on-white in
 * both themes because that's what gets printed and sent. Every text block
 * is editable in place before downloading, and "Download PDF" uses the
 * browser's own print-to-PDF with everything but the sheet hidden.
 */
export function ResumeBuilder({
  opportunityId,
  candidate,
  jobLabel,
}: {
  opportunityId: string;
  candidate: Candidate;
  jobLabel: string;
}) {
  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateTailoredResumeDocAction(opportunityId);
      if ("error" in res) setError(res.error);
      else setResume(res.data);
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setLoading(false);
  }

  function copyText() {
    const sheet = document.getElementById("resume-sheet");
    if (!sheet) return;
    navigator.clipboard.writeText(sheet.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function download() {
    const previous = document.title;
    document.title = `${candidate.name || "Resume"} - ${jobLabel}`.replace(/[\\/:*?"<>|]/g, "");
    window.print();
    document.title = previous;
  }

  if (!resume) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Build an apply-ready resume for this job
          </CardTitle>
          <CardDescription>
            Work-ly picks and rewrites your most relevant real experience for this posting, orders your skills by what
            it asks for, and writes a short summary. It never adds employers, dates, tools or numbers you didn&apos;t
            give it. You can edit anything before downloading.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <Button onClick={generate} disabled={loading} className="gap-2">
            {loading ? <WorklyLoader className="size-4 animate-spin" /> : <FileText className="size-4" />}
            {loading ? "Building your resume..." : "Build my resume"}
          </Button>
          {loading && <p className="text-xs text-muted-foreground">This usually takes 15 to 30 seconds.</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  const contact = [candidate.email, candidate.location].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <style>{`
        @media print {
          @page { size: auto; margin: 14mm; }
          body * { visibility: hidden !important; }
          #resume-sheet, #resume-sheet * { visibility: visible !important; }
          #resume-sheet { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div
        id="resume-sheet"
        className="mx-auto w-full max-w-[816px] rounded-md border border-border bg-white px-10 py-10 text-[13px] leading-relaxed text-neutral-900 shadow-sm"
        style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
      >
        <header className="border-b border-neutral-300 pb-3">
          <h1 contentEditable suppressContentEditableWarning className="text-2xl font-semibold tracking-tight outline-none">
            {candidate.name || "Your Name"}
          </h1>
          {candidate.headline && (
            <p contentEditable suppressContentEditableWarning className="mt-0.5 text-sm text-neutral-700 outline-none">
              {candidate.headline}
            </p>
          )}
          <p contentEditable suppressContentEditableWarning className="mt-1 text-xs text-neutral-600 outline-none">
            {contact}
          </p>
        </header>

        <section className="mt-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Summary</h2>
          <p contentEditable suppressContentEditableWarning className="mt-1 outline-none">
            {resume.summary}
          </p>
        </section>

        {resume.roles.length > 0 && (
          <section className="mt-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Experience</h2>
            <div className="mt-1 flex flex-col gap-3">
              {resume.roles.map((role, i) => (
                <div key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="font-semibold">
                      {role.title}
                      <span className="font-normal text-neutral-700"> · {role.company}</span>
                      {role.location && <span className="font-normal text-neutral-500"> · {role.location}</span>}
                    </p>
                    <p className="text-xs tabular-nums text-neutral-600">{role.dates}</p>
                  </div>
                  {role.bullets.length > 0 && (
                    <ul className="mt-1 list-disc pl-5">
                      {role.bullets.map((b, j) => (
                        <li key={j} contentEditable suppressContentEditableWarning className="outline-none">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.projects.length > 0 && (
          <section className="mt-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Projects</h2>
            <div className="mt-1 flex flex-col gap-2">
              {resume.projects.map((p, i) => (
                <div key={i}>
                  <p className="font-semibold">{p.name}</p>
                  <ul className="list-disc pl-5">
                    {p.bullets.map((b, j) => (
                      <li key={j} contentEditable suppressContentEditableWarning className="outline-none">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.skills.length > 0 && (
          <section className="mt-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Skills</h2>
            <p contentEditable suppressContentEditableWarning className="mt-1 outline-none">
              {resume.skills.join(" · ")}
            </p>
          </section>
        )}

        {resume.education.length > 0 && (
          <section className="mt-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Education</h2>
            <div className="mt-1 flex flex-col gap-1">
              {resume.education.map((e, i) => (
                <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p>{e.line}</p>
                  {e.dates && <p className="text-xs tabular-nums text-neutral-600">{e.dates}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.certifications.length > 0 && (
          <section className="mt-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Certifications</h2>
            <p className="mt-1">{resume.certifications.join(" · ")}</p>
          </section>
        )}
      </div>

      <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0 print:hidden">
        <Card>
          <CardContent className="flex flex-col gap-2 px-4 py-4">
            <Button onClick={download} className="gap-2">
              <Download className="size-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={copyText} className="gap-2">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy as text"}
            </Button>
            <Button variant="ghost" onClick={generate} disabled={loading} className="gap-2 text-muted-foreground">
              {loading ? <WorklyLoader className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Rebuild
            </Button>
            <p className="text-xs text-muted-foreground">Click any text on the page to edit it before downloading.</p>
          </CardContent>
        </Card>

        {resume.unverifiedNumbers.length > 0 && (
          <Card className="border-warning/40">
            <CardContent className="flex gap-2 px-4 py-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <p>
                Check these numbers: <span className="font-medium">{resume.unverifiedNumbers.join(", ")}</span>. They
                aren&apos;t in the lines they were rewritten from, so keep them only if they&apos;re true.
              </p>
            </CardContent>
          </Card>
        )}

        {resume.keywordsCovered.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Job keywords you cover</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5 px-4 pb-4">
              {resume.keywordsCovered.map((k) => (
                <Badge key={k} variant="success">{k}</Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {resume.keywordsMissing.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Not on your profile</CardTitle>
              <CardDescription className="text-xs">
                Left out on purpose. Add them only once you can back them up.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5 px-4 pb-4">
              {resume.keywordsMissing.map((k) => (
                <Badge key={k} variant="outline">{k}</Badge>
              ))}
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
