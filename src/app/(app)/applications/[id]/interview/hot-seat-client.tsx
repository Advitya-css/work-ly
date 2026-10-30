"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- the Web Speech API has no shipped types */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Mic, NotebookPen, RotateCcw, Sparkles, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { CopyButton } from "@/components/opportunities/tool-dialog";
import { KitLabel } from "@/components/kit/kit-parts";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface PreparedQuestion {
  question: string;
  answerFrom?: string | null;
  outline?: string[];
}

interface Scorecard {
  score: number;
  whatWorked: string[];
  whatToFix: string[];
  betterAnswer: string;
  unverified?: string[];
}

const BEATS = ["Situation", "What you did", "Result"];

function scoreTone(score: number) {
  return score >= 8 ? "text-success" : score >= 5 ? "text-warning" : "text-destructive";
}
function scoreStroke(score: number) {
  return score >= 8 ? "stroke-success" : score >= 5 ? "stroke-warning" : "stroke-destructive";
}

/** A ring that fills to the score out of 10. */
function ScoreDial({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex size-20 shrink-0 items-center justify-center">
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-700", scoreStroke(score))}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 10)}
        />
      </svg>
      <span className="flex items-baseline">
        <span className={cn("text-2xl font-medium tabular-nums", scoreTone(score))}>{score}</span>
        <span className="text-xs text-muted-foreground">/10</span>
      </span>
    </div>
  );
}

/**
 * THE MOCK INTERVIEW: one question at a time, answered out loud or typed,
 * scored the way a hiring manager would in a debrief, with what to fix
 * and a stronger version built only from the candidate's real history.
 * Starts from the kit's prepared questions when there are some.
 */
export function HotSeatClient({
  applicationId,
  prepared = [],
  startAt = 0,
}: {
  applicationId: string;
  prepared?: PreparedQuestion[];
  startAt?: number;
}) {
  const [questions, setQuestions] = useState<PreparedQuestion[]>(prepared);
  const [currentIndex, setCurrentIndex] = useState(prepared.length > 0 ? Math.min(Math.max(startAt, 0), prepared.length - 1) : -1);
  const [scores, setScores] = useState<(number | null)[]>(() => prepared.map(() => null));
  const [finished, setFinished] = useState(false);

  const [loading, setLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const [evaluating, setEvaluating] = useState(false);
  const [card, setCard] = useState<Scorecard | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Firefox and parts of Safari have no speech recognition. Typing is the
  // fallback there (and always allowed), instead of a mic that "listens"
  // and records nothing.
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
        setTranscript(text);
      };
      // The browser stops listening on its own after silence; without
      // these the UI stayed stuck on "Listening...".
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
      // Feature detection has to run in the browser, after the first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpeechSupported(true);
    }
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // already stopped
      }
    };
  }, []);

  async function readError(res: Response, fallback: string): Promise<string> {
    const data = await res.json().catch(() => ({}));
    return (data && typeof data.error === "string" && data.error) || fallback;
  }

  function begin(list: PreparedQuestion[]) {
    setQuestions(list);
    setScores(list.map(() => null));
    setCurrentIndex(0);
    setFinished(false);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-prep`, { method: "POST" });
      if (!res.ok) setError(await readError(res, "Couldn't prepare questions. Please try again."));
      else {
        const data = await res.json();
        const list = Array.isArray(data.questions) ? data.questions.filter((q: unknown) => typeof q === "string") : [];
        if (list.length > 0) begin(list.map((q: string) => ({ question: q })));
        else setError("Couldn't prepare questions. Please try again.");
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setLoading(false);
  }

  function toggleRecording() {
    if (!speechSupported) return;
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    setTranscript("");
    setCard(null);
    try {
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // already stopped
    }
    setIsRecording(false);
  }

  async function submitAnswer() {
    if (!transcript.trim()) return;
    stopListening();
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questions[currentIndex].question, answer: transcript }),
      });
      if (!res.ok) setError(await readError(res, "Couldn't score that answer. Please try again."));
      else {
        const data = await res.json();
        const r = data?.result as Scorecard | undefined;
        if (r && typeof r.score === "number") {
          setCard(r);
          setScores((s) => s.map((v, i) => (i === currentIndex ? r.score : v)));
        } else setError("Couldn't score that answer. Please try again.");
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setEvaluating(false);
  }

  function goTo(index: number) {
    stopListening();
    setTranscript("");
    setCard(null);
    setShowNotes(false);
    setError(null);
    if (index >= questions.length) setFinished(true);
    else setCurrentIndex(index);
  }

  // ---- Start: no questions yet ------------------------------------------------
  if (currentIndex === -1) {
    return (
      <div className="flex flex-col gap-4">
        <section className="feature-panel flex flex-col items-start gap-4 p-6 sm:p-8">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Practise the interview for this job</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Five questions this hiring manager is likely to ask you: where your evidence is thin, deep dives into your
              own history, and a situation from the day-to-day work. Answer out loud or type, and get scored like a real
              debrief.
            </p>
          </div>
          <Button onClick={() => void handleGenerate()} disabled={loading} size="lg" className="gap-2">
            {loading ? <WorklyLoader className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Preparing your questions…" : "Start with five questions"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[15px] font-semibold text-foreground">Or practise a question you dread</h3>
            <p className="text-[13px] text-muted-foreground">The one that keeps you up at night. You&apos;ll get the same scorecard.</p>
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (customQuestion.trim()) begin([{ question: customQuestion.trim() }]);
              setCustomQuestion("");
            }}
          >
            <input
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="e.g. Why did you leave your last job so quickly?"
              aria-label="Your question"
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" variant="outline" disabled={!customQuestion.trim()}>
              Practise it
            </Button>
          </form>
        </section>
      </div>
    );
  }

  // ---- Summary ---------------------------------------------------------------
  if (finished) {
    const answered = scores.filter((s): s is number => s != null);
    const average = answered.length ? Math.round((answered.reduce((a, b) => a + b, 0) / answered.length) * 10) / 10 : null;
    return (
      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-5">
          {average != null && <ScoreDial score={Math.round(average)} />}
          <div className="flex flex-col gap-1">
            <KitLabel>Session done</KitLabel>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {average == null ? "No answers scored this time" : `Average ${average} out of 10`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {average == null
                ? "Answer at least one question to get a score."
                : average >= 8
                  ? "Interview-ready on these. Run it once more the day before."
                  : "Redo the lowest ones using the stronger versions, out loud, until they feel natural."}
            </p>
          </div>
        </div>
        <ol className="flex flex-col divide-y divide-border border-y border-border">
          {questions.map((q, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <span className="text-[11.5px] tabular-nums text-muted-foreground">Q{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{q.question}</span>
              {scores[i] != null ? (
                <span className={cn("text-[13px] tabular-nums", scoreTone(scores[i]!))}>{scores[i]}/10</span>
              ) : (
                <span className="text-[12.5px] text-muted-foreground">Skipped</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFinished(false);
                  goTo(i);
                }}
              >
                Redo
              </Button>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  // ---- A question --------------------------------------------------------------
  const q = questions[currentIndex];
  const notes = Boolean(q.answerFrom || q.outline?.length);
  const last = currentIndex === questions.length - 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <ol className="flex flex-1 gap-1" aria-label="Progress">
          {questions.map((_, i) => (
            <li key={i} className="flex-1">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Question ${i + 1}${scores[i] != null ? `, scored ${scores[i]}` : ""}`}
                aria-current={i === currentIndex ? "step" : undefined}
                className={cn(
                  "block h-1.5 w-full rounded-full transition-colors",
                  i === currentIndex ? "bg-primary-solid" : scores[i] != null ? "bg-foreground/40" : "bg-muted",
                )}
              />
            </li>
          ))}
        </ol>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {currentIndex + 1}/{questions.length}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setFinished(true)}>
          End
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-3 px-6 pb-6 pt-7 sm:px-8">
          <KitLabel>The interviewer asks</KitLabel>
          <p className="text-balance text-[22px] font-medium leading-snug tracking-[-0.02em] text-foreground">{q.question}</p>
          {notes && (
            <button
              type="button"
              onClick={() => setShowNotes((v) => !v)}
              className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={showNotes}
            >
              <NotebookPen className="size-3.5" aria-hidden />
              {showNotes ? "Hide my notes" : "Peek at my notes"}
            </button>
          )}
          {notes && showNotes && (
            <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-4 py-3 text-[13px] leading-relaxed">
              {q.answerFrom && <p className="text-foreground">&ldquo;{q.answerFrom}&rdquo;</p>}
              {q.outline && q.outline.length === 3 && (
                <ol className="flex flex-col gap-1">
                  {q.outline.map((b, j) => (
                    <li key={j}>
                      <span className="text-muted-foreground">{BEATS[j]}: </span>
                      <span className="text-foreground">{b}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        {!card && (
          <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  aria-label={isRecording ? "Stop recording" : "Answer out loud"}
                  className={cn(
                    "relative flex size-12 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isRecording ? "bg-destructive text-white" : "bg-primary-solid text-primary-solid-foreground hover:bg-primary-solid/90",
                  )}
                >
                  {isRecording && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" aria-hidden />}
                  {isRecording ? <Square className="relative size-4" /> : <Mic className="size-5" />}
                </button>
              )}
              <p className="text-[13px] text-muted-foreground" aria-live="polite">
                {isRecording
                  ? "Listening. Answer as you would in the room, then stop."
                  : speechSupported
                    ? "Answer out loud, or type below. Aim for about a minute."
                    : "Type your answer as you'd say it. Aim for about a minute."}
              </p>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              placeholder="Your answer appears here. Edit it before you submit if the transcript slipped."
              className="min-h-[150px] w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-[14.5px] leading-relaxed outline-none [field-sizing:content] focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11.5px] tabular-nums text-muted-foreground">
                {transcript.trim() ? transcript.trim().split(/\s+/).length : 0} words
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => goTo(currentIndex + 1)}>
                  Skip
                </Button>
                <Button onClick={() => void submitAnswer()} disabled={evaluating || !transcript.trim()} className="gap-2">
                  {evaluating ? <WorklyLoader className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {evaluating ? "Scoring like a hiring manager…" : "Score my answer"}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {card && (
          <div className="flex flex-col gap-5 border-t border-border px-6 py-6 animate-in fade-in slide-in-from-bottom-2 sm:px-8">
            <div className="flex items-center gap-5">
              <ScoreDial score={card.score} />
              <div className="flex flex-col gap-1">
                <KitLabel>Debrief</KitLabel>
                <p className="text-[15px] font-medium text-foreground">
                  {card.score >= 8 ? "Strong. This would move you forward." : card.score >= 5 ? "Decent, with one or two things to fix." : "Not there yet. Use the stronger version below."}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {card.whatWorked.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-success">What worked</span>
                  <ul className="flex flex-col gap-1.5 text-[13.5px] leading-snug text-foreground">
                    {card.whatWorked.map((p) => (
                      <li key={p} className="flex gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {card.whatToFix.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-warning">What to fix</span>
                  <ul className="flex flex-col gap-1.5 text-[13.5px] leading-snug text-foreground">
                    {card.whatToFix.map((p) => (
                      <li key={p} className="flex gap-2">
                        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-foreground">A stronger version, from your real history</span>
                <CopyButton text={card.betterAnswer} label="Copy" variant="ghost" size="sm" />
              </div>
              <p className="text-[14px] leading-relaxed text-foreground">{card.betterAnswer}</p>
              {card.unverified && card.unverified.length > 0 && (
                <p className="flex gap-1.5 text-[12.5px] text-muted-foreground">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                  Check {card.unverified.join(", ")}: it isn&apos;t on your profile or in your answer.
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setCard(null);
                  setTranscript("");
                }}
              >
                <RotateCcw className="size-4" />
                Try it again
              </Button>
              <Button className="gap-2" onClick={() => goTo(currentIndex + 1)}>
                {last ? "Finish" : "Next question"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
