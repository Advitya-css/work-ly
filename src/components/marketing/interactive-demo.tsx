"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, CheckCircle2, Search, Briefcase, FileText, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "ats", label: "ATS Resume Tailor", icon: FileText },
  { id: "gaps", label: "Dream Job Gaps", icon: Target },
  { id: "discovery", label: "Smart Discovery", icon: Search },
];

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState("ats");
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Reset state when switching tabs
  useEffect(() => {
    setIsSimulating(false);
    setShowResult(false);
  }, [activeTab]);

  const handleSimulate = () => {
    setIsSimulating(true);
    setShowResult(false);
    setTimeout(() => {
      setIsSimulating(false);
      setShowResult(true);
    }, 1500);
  };

  return (
    <section className="px-4 py-16 sm:px-6 bg-accent/30 border-y border-border">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
            <Sparkles className="size-6 text-primary" />
            See the Magic Before You Sign Up
          </h2>
          <p className="mt-3 text-muted-foreground">
            Experience how Work-ly gives you an unfair advantage in the job hunt.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Tabs Sidebar */}
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 md:w-64 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:bg-accent/50 text-muted-foreground"
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Interactive Window */}
          <div className="flex-1 bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm min-h-[400px] flex flex-col relative overflow-hidden">
            
            {activeTab === "ats" && (
              <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-lg">AI Resume Tailor</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Bypass the ATS</span>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="bg-muted rounded-md p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Job Description (Target)</p>
                    <p className="text-sm font-mono text-foreground/80 leading-relaxed">
                      "Looking for a frontend engineer experienced in React, state management (Redux/Zustand), and optimizing web vitals..."
                    </p>
                  </div>
                  <div className="bg-muted rounded-md p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Your Original Bullet</p>
                    <p className="text-sm font-mono text-foreground/80 leading-relaxed">
                      "Built websites using javascript and react, made them load faster."
                    </p>
                  </div>
                </div>

                {!showResult ? (
                  <div className="mt-auto flex flex-col items-center justify-center py-6">
                    <Button onClick={handleSimulate} disabled={isSimulating} size="lg" className="w-full sm:w-auto">
                      {isSimulating ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                      {isSimulating ? "Tailoring for ATS..." : "Run AI Tailor Demo"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-auto animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
                        <CheckCircle2 className="size-4" />
                        <span>Optimized for ATS Match</span>
                      </div>
                      <p className="text-sm font-mono leading-relaxed bg-background p-3 rounded border border-border">
                        "Engineered responsive frontend architectures using React and global state management (Zustand), optimizing core web vitals to increase page load speeds by 40%."
                      </p>
                      <p className="text-xs text-muted-foreground mt-3">
                        <span className="font-semibold text-foreground">Keywords injected:</span> frontend engineer, state management, Zustand, core web vitals
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "gaps" && (
              <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Dream Job Analysis</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">30-Day Pathway</span>
                </div>

                <div className="bg-muted rounded-md p-4 border border-border mb-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground">Current Role</p>
                    <p className="text-sm font-medium">Junior Data Analyst</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <div className="flex-1 text-right">
                    <p className="text-xs font-semibold text-muted-foreground">Dream Role</p>
                    <p className="text-sm font-medium">Senior Data Scientist (Stripe)</p>
                  </div>
                </div>

                {!showResult ? (
                  <div className="mt-auto flex flex-col items-center justify-center py-6">
                    <Button onClick={handleSimulate} disabled={isSimulating} size="lg" className="w-full sm:w-auto">
                      {isSimulating ? <Loader2 className="size-4 animate-spin mr-2" /> : <Target className="size-4 mr-2" />}
                      {isSimulating ? "Analyzing Skill Gaps..." : "Analyze My Gaps Demo"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-auto animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-background border border-border rounded-lg overflow-hidden">
                      <div className="bg-destructive/10 p-3 border-b border-border">
                        <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                          Missing Core Skills (ATS Red Flags)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Python (Pandas/NumPy), A/B Testing, Machine Learning Basics</p>
                      </div>
                      <div className="p-4 bg-primary/5">
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Sparkles className="size-4 text-primary" />
                          Your 30-Day Action Plan
                        </p>
                        <ul className="space-y-2 text-sm text-foreground/80">
                          <li className="flex gap-2"><span className="text-primary font-bold">Week 1:</span> Complete "A/B Testing in Python" free course.</li>
                          <li className="flex gap-2"><span className="text-primary font-bold">Week 2:</span> Build a predictive model using Scikit-Learn on Kaggle.</li>
                          <li className="flex gap-2"><span className="text-primary font-bold">Week 3:</span> Add the Kaggle project to your resume using the Work-ly Tailor.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "discovery" && (
              <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Smart Discovery</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Fit Scores</span>
                </div>

                <div className="bg-muted rounded-md p-4 border border-border mb-4 text-center">
                  <p className="text-sm font-medium">
                    We scan 10,000+ roles daily and score them against your exact resume and career goals.
                  </p>
                </div>

                {!showResult ? (
                  <div className="mt-auto flex flex-col items-center justify-center py-6">
                    <Button onClick={handleSimulate} disabled={isSimulating} size="lg" className="w-full sm:w-auto">
                      {isSimulating ? <Loader2 className="size-4 animate-spin mr-2" /> : <Search className="size-4 mr-2" />}
                      {isSimulating ? "Scoring Jobs..." : "Find My Best Matches Demo"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-background border border-border p-3 rounded-lg flex items-center justify-between hover:border-primary transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="bg-accent size-10 rounded-md flex items-center justify-center">
                          <Briefcase className="size-5 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Product Manager</p>
                          <p className="text-xs text-muted-foreground">TechCorp Inc. • Remote</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-500">92%</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fit Score</p>
                      </div>
                    </div>
                    
                    <div className="bg-background border border-border p-3 rounded-lg flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-3">
                        <div className="bg-accent size-10 rounded-md flex items-center justify-center">
                          <Briefcase className="size-5 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Associate PM</p>
                          <p className="text-xs text-muted-foreground">StartupX • New York</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-500">78%</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fit Score</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Call to action across all tabs */}
            {showResult && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-card via-card to-transparent pt-12 flex justify-center">
                <Button asChild size="lg" className="shadow-xl shadow-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <a href="/sign-up">
                    Try it with your own data <ArrowRight className="ml-2 size-4" />
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
