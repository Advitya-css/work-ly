"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Sparkles, Send, Play, CheckCircle2, ChevronRight, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function HotSeatClient({ applicationId }: { applicationId: string }) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = setup, 0+ = question index
  
  const [loading, setLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Firefox and parts of Safari have no speech recognition. Typing is the
  // fallback there (and always allowed), instead of a mic that "listens"
  // and records nothing.
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };
        // The browser stops listening on its own after silence; without
        // these the UI stayed stuck on "Listening...".
        recognitionRef.current.onend = () => setIsRecording(false);
        recognitionRef.current.onerror = () => setIsRecording(false);
        setSpeechSupported(true);
      }
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

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-prep`, { method: "POST" });
      if (!res.ok) {
        setError(await readError(res, "Couldn't prepare questions. Please try again."));
      } else {
        const data = await res.json();
        const list = Array.isArray(data.questions) ? data.questions.filter((q: unknown) => typeof q === "string") : [];
        if (list.length > 0) {
          setQuestions(list);
          setCurrentIndex(0);
        } else {
          setError("Couldn't prepare questions. Please try again.");
        }
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setLoading(false);
  };

  const handleAddCustom = () => {
    if (!customQuestion.trim()) return;
    setQuestions([customQuestion]);
    setCurrentIndex(0);
    setCustomQuestion("");
  };

  const toggleRecording = () => {
    if (!speechSupported) return;
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript("");
      setFeedback(null);
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  const endSession = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // already stopped
    }
    setIsRecording(false);
    setTranscript("");
    setFeedback(null);
    setCurrentIndex(-1);
  };

  const submitAnswer = async () => {
    if (!transcript.trim()) return;
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questions[currentIndex], answer: transcript }),
      });
      if (!res.ok) {
        setError(await readError(res, "Couldn't score that answer. Please try again."));
      } else {
        const data = await res.json();
        if (typeof data.text === "string") setFeedback(data.text);
        else setError("Couldn't score that answer. Please try again.");
      }
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setEvaluating(false);
  };

  const nextQuestion = () => {
    setTranscript("");
    setFeedback(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(-1); // Back to start
      setQuestions([]);
    }
  };

  if (currentIndex === -1) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              The Griller (Hyper-Real Generation)
            </CardTitle>
            <CardDescription>
              Five questions a real hiring manager for this job would ask you: where your evidence is thin, deep dives into your own history, and a situation from the day-to-day work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <WorklyLoader className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate Interview Questions
            </Button>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 px-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom Fire</CardTitle>
            <CardDescription>Practice answering a specific question you struggle with.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input 
              placeholder="e.g. Why did you leave your last job so quickly?" 
              value={customQuestion} 
              onChange={e => setCustomQuestion(e.target.value)} 
            />
            <Button variant="secondary" onClick={handleAddCustom} disabled={!customQuestion.trim()}>
              Practice
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <Button variant="ghost" size="sm" onClick={endSession}>End Session</Button>
      </div>

      <Card className="border-2 border-primary/20 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <CardHeader className="pt-8 pb-6">
          <CardTitle className="text-2xl leading-tight font-semibold text-center">
            "{questions[currentIndex]}"
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pb-8">
          
          {/* Controls */}
          {!feedback && (
            <div className="flex flex-col items-center gap-4 w-full">
              {speechSupported && (
                <>
                  <Button
                    size="lg"
                    variant={isRecording ? "destructive" : "default"}
                    className="rounded-full w-20 h-20 shadow-xl transition-all"
                    onClick={toggleRecording}
                    aria-label={isRecording ? "Stop recording" : "Record your answer"}
                  >
                    {isRecording ? <Square className="size-8" /> : <Mic className="size-8" />}
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    {isRecording ? "Listening... (click to stop)" : "Click to answer out loud, or type below"}
                  </span>
                </>
              )}

              {!isRecording && (
                <div className="w-full mt-2 flex flex-col gap-3">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={6}
                    placeholder={speechSupported ? "Your answer appears here. You can edit it before submitting." : "Type your answer as you would say it."}
                    className="w-full rounded-xl border border-border bg-secondary/40 p-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button onClick={submitAnswer} disabled={evaluating || !transcript.trim()} className="w-full gap-2" size="lg">
                    {evaluating ? <WorklyLoader className="size-5 animate-spin" /> : <Send className="size-5" />}
                    {evaluating ? "Scoring..." : "Submit for Feedback"}
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              )}
            </div>
          )}

          {/* Transcript preview during recording */}
          {isRecording && transcript && (
            <div className="w-full p-4 rounded-xl bg-secondary/20 text-sm leading-relaxed text-muted-foreground border border-border border-dashed italic">
              {transcript}
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-4 text-primary font-semibold">
                  <CheckCircle2 className="size-5" />
                  AI Scorecard
                </div>
                <MarkdownRenderer content={feedback} className="text-sm" />
              </div>
              <Button onClick={nextQuestion} className="w-full mt-6 gap-2" size="lg" variant="secondary">
                {currentIndex < questions.length - 1 ? "Next Question" : "Finish Practice"}
                <ChevronRight className="size-5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
