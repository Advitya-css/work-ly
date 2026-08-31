"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { UpgradeButton } from "./upgrade-button";

export function PricingCard() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="size-6 text-primary" />
              {isYearly ? "Work-ly Pro Yearly" : "Work-ly Pro Monthly"}
            </CardTitle>
            <CardDescription className="mt-1">Unlock the ultimate unfair advantage in your job hunt.</CardDescription>
          </div>
          
          <div className="flex items-center p-1 bg-muted rounded-full w-fit">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                !isYearly 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 ${
                isYearly 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="text-[10px] bg-green-500/10 text-green-600 font-bold px-1.5 py-0.5 rounded-full">
                SAVE 33%
              </span>
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <ul className="space-y-3 text-sm font-medium">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
            <span><strong>Unlimited AI Dream Job Analyses</strong><br/><span className="text-muted-foreground font-normal">Deep gap analysis against any role.</span></span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
            <span><strong>AI Resume Tailoring</strong><br/><span className="text-muted-foreground font-normal">Rewrite your resume to beat ATS systems.</span></span>
          </li>
        </ul>
        <ul className="space-y-3 text-sm font-medium">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
            <span><strong>The Dream Pathway</strong><br/><span className="text-muted-foreground font-normal">Personalized 30-day coaching plans.</span></span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
            <span><strong>Interview Simulator</strong><br/><span className="text-muted-foreground font-normal">Live behavioral & tech sandboxes.</span></span>
          </li>
        </ul>
      </CardContent>
      
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
        <div className="flex flex-col">
          {isYearly ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">$120</span>
                <span className="text-muted-foreground line-through text-sm">$180</span>
              </div>
              <span className="text-xs font-medium text-green-600 mt-1">Billed $120 yearly (Save $60)</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold">$15<span className="text-base font-normal text-muted-foreground"> / month</span></span>
              <span className="text-xs text-muted-foreground mt-1">Cancel anytime.</span>
            </>
          )}
        </div>
        <UpgradeButton interval={isYearly ? "yearly" : "monthly"} />
      </CardFooter>
    </Card>
  );
}
