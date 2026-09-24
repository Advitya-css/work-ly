"use client";

import { CheckCircle2, Sparkles, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { UpgradeButton } from "./upgrade-button";

export function PricingCard() {
  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="size-6 text-primary" />
          Work-ly Pro
        </h2>
        <p className="text-muted-foreground mt-2">Get the ultimate unfair advantage in your job hunt.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Monthly Tier */}
        <Card className="flex flex-col relative border-border shadow-sm bg-card hover:border-primary/20 transition-all">
          <CardHeader>
            <CardTitle className="text-xl">Monthly</CardTitle>
            <CardDescription>Pay as you go</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$19.99</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Auto-renews. Cancel anytime.</p>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>Unlimited AI Job Analyses</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>AI Resume Tailoring</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>The Dream Pathway</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>Interview Simulator</span></li>
            </ul>
          </CardContent>
          <CardFooter>
            <UpgradeButton interval="monthly" className="w-full" variant="outline" />
          </CardFooter>
        </Card>

        {/* 3-Month Pass */}
        <Card className="flex flex-col relative border-primary shadow-md bg-gradient-to-b from-primary/10 to-transparent transform md:-translate-y-2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="size-3 fill-current" /> Most popular
          </div>
          <CardHeader>
            <CardTitle className="text-xl">3-Month Pass</CardTitle>
            <CardDescription>Perfect for a focused hunt</CardDescription>
            <div className="mt-4 flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$49.99</span>
              </div>
              <span className="text-sm font-medium text-primary mt-1">Just $16.67/mo</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">One-time payment. No auto-renew.</p>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>All Monthly features</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>3 full months of access</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>No hidden subscriptions</span></li>
            </ul>
          </CardContent>
          <CardFooter>
            <UpgradeButton interval="quarterly" className="w-full" />
          </CardFooter>
        </Card>

        {/* Yearly Pass */}
        <Card className="flex flex-col relative border-border shadow-sm bg-card hover:border-primary/20 transition-all">
          <CardHeader>
            <CardTitle className="text-xl">Yearly Pass</CardTitle>
            <CardDescription>For students & career switchers</CardDescription>
            <div className="mt-4 flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">$149.99</span>
                <span className="text-lg text-muted-foreground line-through">$240</span>
              </div>
              <span className="text-sm font-medium text-green-600 mt-1">Save 37%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">One-time payment. No auto-renew.</p>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>All Monthly features</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>12 full months of access</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>No hidden subscriptions</span></li>
            </ul>
          </CardContent>
          <CardFooter>
            <UpgradeButton interval="yearly" className="w-full" variant="outline" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
