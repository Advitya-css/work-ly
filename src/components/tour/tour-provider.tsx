"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  FileText,
  Home,
  Briefcase,
  Mail,
  MessagesSquare,
  PenLine,
  Send,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TourContextType {
  startTour: () => void;
}

// A no-op default rather than undefined: the Guide's "Replay the welcome"
// button can render before the provider is ready, and must never throw.
const TourContext = createContext<TourContextType>({ startTour: () => {} });

export function useTour() {
  return useContext(TourContext);
}

const TOUR_STORAGE_KEY = "workly_has_seen_tour";

function seen(): boolean {
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEY) === "true";
  } catch {
    return true; // storage blocked: don't show it on every page load
  }
}
function markSeen() {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "true");
  } catch {
    // Storage blocked: at worst it shows once more next visit.
  }
}

// ---------------------------------------------------------------------------
// The four pictures. Small, real-looking slices of the app, not decoration.

function PictureHello() {
  return (
    <div className="flex h-full items-center justify-center">
      <Image src="/workly-bot-face.png" alt="" width={120} height={120} className="size-28 object-contain drop-shadow-sm motion-safe:animate-[bob_3s_ease-in-out_infinite]" priority />
    </div>
  );
}

function PictureVerdict() {
  const rows = [
    { icon: CheckCircle2, tone: "text-success", text: "SQL and Python", note: "“Built 40+ dbt models on BigQuery…”" },
    { icon: CircleDashed, tone: "text-warning", text: "Tableau, ideally certified", note: "Dashboards for 3 clients; no certificate" },
    { icon: CircleSlash, tone: "text-destructive", text: "AWS data services", note: "Not on your resume yet" },
  ];
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-3.5 text-left shadow-sm">
        <p className="text-lg font-semibold tracking-tight text-success">Apply.</p>
        <ul className="mt-2 flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.text} className="flex gap-2">
              <r.icon className={cn("mt-0.5 size-3.5 shrink-0", r.tone)} aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="text-[12.5px] font-medium leading-tight text-foreground">{r.text}</span>
                <span className="truncate text-[11.5px] text-muted-foreground">{r.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PictureKit() {
  const items = [
    { icon: FileText, label: "Resume" },
    { icon: PenLine, label: "Cover letter" },
    { icon: Mail, label: "Note to the hiring manager" },
    { icon: MessagesSquare, label: "Interview prep" },
  ];
  return (
    <div className="flex h-full items-center justify-center px-6">
      <ul className="grid w-full max-w-xs grid-cols-2 gap-2">
        {items.map((it) => (
          <li key={it.label} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left shadow-sm">
            <it.icon className="size-4 text-primary" aria-hidden />
            <span className="text-[12px] font-medium leading-tight text-foreground">{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PictureMap() {
  const items = [
    { icon: Home, label: "Home", note: "your next move" },
    { icon: Briefcase, label: "Jobs", note: "jobs you're checking" },
    { icon: UserRound, label: "My career", note: "your resume and goals" },
    { icon: Send, label: "Applications", note: "what you've sent" },
  ];
  return (
    <div className="flex h-full items-center justify-center px-6">
      <ul className="flex w-full max-w-xs flex-col gap-1 rounded-xl border border-border bg-sidebar p-2 text-left shadow-sm">
        {items.map((it, i) => (
          <li key={it.label} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5", i === 0 && "bg-sidebar-accent")}>
            <it.icon className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-[13px] font-medium text-foreground">{it.label}</span>
            <span className="ml-auto text-[11.5px] text-muted-foreground">{it.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SLIDES = [
  {
    picture: PictureHello,
    title: "Hi, I'm Work-ly.",
    body: "I help you spend your evenings on the jobs that are worth it. I'll tell you honestly where you stand, and I never make anything up.",
  },
  {
    picture: PictureVerdict,
    title: "Every job gets a straight answer.",
    body: "Paste a job, or let me find some. I check each requirement against your resume, only count what I can quote, and tell you to apply, stretch or skip.",
  },
  {
    picture: PictureKit,
    title: "If it's a yes, I write the application.",
    body: "A resume, cover letter, a note to the hiring manager and interview prep, built from your real experience for that one job. You can edit every word.",
  },
  {
    picture: PictureMap,
    title: "Four places, that's all.",
    body: "Home always shows your next move. If you're ever unsure, open the Guide in the sidebar, or ask me in the corner of any page.",
  },
];

/**
 * THE WELCOME. Four short cards, the robot doing the talking, shown once
 * on a person's first visit and replayable from the Guide.
 *
 * It replaces a seven-stop tour that pointed at sidebar items one by one:
 * that taught where the menus were but not what Work-ly is for, didn't run
 * on phones, and talked over the first-steps card on Home. This one teaches
 * the idea (straight answers, proven from your resume, then the application
 * written), works on any screen, and ends on the one thing to do next.
 */
export function TourProvider({ children, hasResume = false }: { children: ReactNode; hasResume?: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (seen()) return;
    // Let the page settle first; a dialog on the very first paint feels like an ad.
    const timer = setTimeout(() => {
      setIndex(0);
      setOpen(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    markSeen();
    setOpen(false);
  }, []);

  const startTour = useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;
  const Picture = slide.picture;

  return (
    <TourContext.Provider value={{ startTour }}>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-md"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && !last) setIndex((i) => i + 1);
            if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
          }}
        >
          <div className="h-56 bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_75%)]" key={`p-${index}`}>
            <div className="h-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
              <Picture />
            </div>
          </div>
          <div className="flex flex-col gap-2 px-6 pb-5 pt-4" key={`t-${index}`}>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              {index > 0 && <Image src="/workly-bot-face.png" alt="" width={28} height={28} className="size-7 object-contain" />}
              {slide.title}
            </DialogTitle>
            <DialogDescription className="text-[14.5px] leading-relaxed">{slide.body}</DialogDescription>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
            <div className="flex items-center gap-1.5" aria-label={`Card ${index + 1} of ${SLIDES.length}`}>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to card ${i + 1}`}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => setIndex(i)}
                  className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50")}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {index > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)} className="gap-1">
                  <ArrowLeft className="size-3.5" />
                  Back
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={close} className="text-muted-foreground">
                  Skip
                </Button>
              )}
              {last ? (
                <Button asChild size="sm" className="gap-1" onClick={close}>
                  <Link href={hasResume ? "/analyze-job" : "/career-profile"}>
                    {hasResume ? "Check a job" : "Add my resume"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIndex((i) => i + 1)} className="gap-1">
                  Next
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {children}
    </TourContext.Provider>
  );
}
