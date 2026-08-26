"use client";

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
      }
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-prep`, { method: "POST" });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        setCurrentIndex(0);
      }
    } catch (e) {
      console.error(e);
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
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript("");
      setFeedback(null);
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const submitAnswer = async () => {
    if (!transcript.trim()) return;
    setEvaluating(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questions[currentIndex], answer: transcript }),
      });
      const data = await res.json();
      setFeedback(data.text);
    } catch (e) {
      console.error(e);
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
              We will cross-reference your resume with this exact job description and generate 4 targeted attack questions a real hiring manager would ask.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate Interview Questions
            </Button>
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
        <Button variant="ghost" size="sm" onClick={() => setCurrentIndex(-1)}>End Session</Button>
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
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className="rounded-full w-20 h-20 shadow-xl transition-all"
                onClick={toggleRecording}
              >
                {isRecording ? <Square className="size-8" /> : <Mic className="size-8" />}
              </Button>
              <span className="text-sm font-medium text-muted-foreground animate-pulse">
                {isRecording ? "Listening... (Click to stop)" : "Click to answer"}
              </span>

              {transcript && !isRecording && (
                <div className="w-full mt-4 flex flex-col gap-3">
                  <div className="p-4 rounded-xl bg-secondary/50 text-sm leading-relaxed border border-border">
                    {transcript}
                  </div>
                  <Button onClick={submitAnswer} disabled={evaluating} className="w-full gap-2" size="lg">
                    {evaluating ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                    {evaluating ? "Evaluating..." : "Submit for Feedback"}
                  </Button>
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
