"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDashed, CircleSlash, FileText, Mail, MessagesSquare, PenLine } from "lucide-react";

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

function PictureDream() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-3.5 text-left shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Dream job</p>
        <p className="mt-0.5 text-[13px] font-semibold text-foreground">Head of Analytics</p>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[58%] rounded-full bg-warning" />
          </div>
          <span className="text-[12px] font-semibold tabular-nums text-foreground">58%</span>
        </div>
        <ul className="mt-2.5 flex flex-col gap-1 text-[11.5px] text-muted-foreground">
          <li className="flex gap-1.5"><span className="text-success">✓</span> Owns dashboards used by 120 managers</li>
          <li className="flex gap-1.5"><span className="text-warning">~</span> Has led 1 analyst, role asks for a team</li>
          <li className="flex gap-1.5"><span className="text-destructive">✕</span> No budget ownership yet</li>
        </ul>
      </div>
    </div>
  );
}

function PicturePlan() {
  const weeks = [
    { w: "Wk 1-2", t: "Ship one forecasting model", done: true },
    { w: "Wk 3-4", t: "Mentor the new analyst, write it up", done: true },
    { w: "Wk 5-8", t: "Own the quarterly metrics review", done: false },
  ];
  return (
    <div className="flex h-full items-center justify-center px-6">
      <ol className="w-full max-w-xs rounded-xl border border-border bg-card p-3 text-left shadow-sm">
        {weeks.map((x) => (
          <li key={x.w} className="flex items-start gap-2.5 py-1.5">
            <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px]", x.done ? "border-success bg-success text-success-foreground" : "border-border")}>{x.done ? "✓" : ""}</span>
            <span className="flex flex-col">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{x.w}</span>
              <span className="text-[12.5px] font-medium text-foreground">{x.t}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PictureInterview() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-3.5 text-left shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Mock interview</p>
        <p className="mt-1 text-[13px] font-medium leading-snug text-foreground">&ldquo;Tell me about a model you had to redesign.&rdquo;</p>
        <div className="mt-2.5 rounded-lg bg-secondary p-2.5">
          <p className="text-[11px] font-semibold text-foreground">Your answer · 7/10</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">Good: the 40+ models and the 120 managers. Missing: what broke first, and the number it moved.</p>
        </div>
      </div>
    </div>
  );
}

function PictureDiscover() {
  const jobs = [
    { t: "Analytics Engineer", s: 82, v: "Apply", c: "bg-success/15 text-success" },
    { t: "Senior Data Scientist", s: 58, v: "Stretch", c: "bg-warning/15 text-warning" },
    { t: "Cloud Platform Engineer", s: 31, v: "Skip", c: "bg-destructive/15 text-destructive" },
  ];
  return (
    <div className="flex h-full items-center justify-center px-6">
      <ul className="w-full max-w-xs overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm">
        {jobs.map((j) => (
          <li key={j.t} className="flex items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold tabular-nums text-foreground">{j.s}</span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground">{j.t}</span>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", j.c)}>{j.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Slide = { picture: () => ReactNode; title: string; body: string; href?: string; link?: string };
const SLIDES: Slide[] = [
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
    picture: PictureDiscover,
    title: "I'll find jobs worth checking, too.",
    body: "Discover looks for postings that fit what you've really done and gives each one the same straight answer, so you only open the ones worth your time.",
    href: "/discover",
    link: "Open Discover",
  },
  {
    picture: PictureDream,
    title: "Aiming higher? Tell me the dream job.",
    body: "Paste the role you want in two years. I'll show how close you are today, what's missing, and which of your lines already count.",
    href: "/dream-job",
    link: "Try Dream job",
  },
  {
    picture: PicturePlan,
    title: "Then a plan to get there, week by week.",
    body: "The gaps become steps in order, each one something you can finish. Changing fields? Career change rewrites your past work in the new field's language.",
    href: "/career-path",
    link: "See the action plan",
  },
  {
    picture: PictureInterview,
    title: "And I'll practise the interview with you.",
    body: "Answer likely questions out loud or in text; I score each one and say what to add. Students get their own home for campus jobs and internships.",
    href: "/guide",
    link: "Everything in the Guide",
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
  const pathname = usePathname();

  useEffect(() => {
    // Only on Home. Someone who arrives on their first job report from the
    // homepage check should see the verdict they came for, not a welcome
    // on top of it; Home is the next place they'll go.
    if (pathname !== "/dashboard" || seen()) return;
    // Let the page settle first; a dialog on the very first paint feels like an ad.
    const timer = setTimeout(() => {
      setIndex(0);
      setOpen(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [pathname]);

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
            {slide.href && slide.link && (
              <Link
                href={slide.href}
                onClick={close}
                className="mt-0.5 inline-flex w-fit items-center gap-1 text-[13.5px] font-medium text-primary underline-offset-4 hover:underline"
              >
                {slide.link}
                <ArrowRight className="size-3.5" />
              </Link>
            )}
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
                <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)} className="gap-1 px-2" aria-label="Back">
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline">Back</span>
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
