"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCheckoutUrl } from "@/lib/payments/lemonsqueezy";

export function UpgradeModal({ 
  children,
  title = "Unlock Workly Pro",
  description = "Get the ultimate unfair advantage in your job hunt."
}: { 
  children: React.ReactNode,
  title?: string,
  description?: string
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const { url } = await createCheckoutUrl();
      if (url) window.location.href = url;
    } catch (error) {
      console.error(error);
      alert("Failed to generate checkout link. Please make sure all environment variables are set.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles className="size-32" />
        </div>
        
        <DialogHeader className="pt-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Sparkles className="size-6" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4 relative z-10">
          <ul className="space-y-3 text-sm font-medium">
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>Unlimited AI Dream Job Analyses</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>AI Resume Tailoring (Pass ATS systems)</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>The Dream Pathway (30-day coaching)</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>Interview Simulator & Tech Sandbox</span></li>
          </ul>

          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-lg">Workly Pro</span>
              <span className="text-sm text-muted-foreground">$15 / month</span>
            </div>
            <Button onClick={handleUpgrade} disabled={loading} size="lg" className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Upgrade Now"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Secure checkout powered by Lemon Squeezy. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
