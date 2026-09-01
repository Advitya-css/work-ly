"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCheckoutUrl } from "@/lib/payments/lemonsqueezy";
import { redeemBetaCodeAction } from "@/lib/beta/actions";

export function UpgradeModal({ 
  children,
  title = "Unlock Work-ly Pro",
  description = "Get the ultimate unfair advantage in your job hunt."
}: { 
  children: React.ReactNode,
  title?: string,
  description?: string
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showBeta, setShowBeta] = useState(false);
  const [betaCode, setBetaCode] = useState("");
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaError, setBetaError] = useState("");


  const handleRedeemBeta = async () => {
    if (!betaCode.trim()) return;
    setBetaLoading(true);
    setBetaError("");
    try {
      const result = await redeemBetaCodeAction(betaCode);
      if (result && result.error) {
        setBetaError(result.error);
        setBetaLoading(false);
      } else {
        window.location.reload(); // Refresh to apply Pro state globally
      }
    } catch (err: any) {
      console.error(err);
      setBetaError(err.message || "Something went wrong.");
      setBetaLoading(false);
    }
  };

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

          <div className="mt-4 p-4 rounded-lg bg-muted border border-border flex items-center justify-between opacity-80">
            <div className="flex flex-col">
              <span className="font-semibold text-lg line-through">Work-ly Pro</span>
              <span className="text-sm text-muted-foreground">$15 / month</span>
            </div>
            <Button disabled variant="outline" size="lg" className="gap-2 cursor-not-allowed">
              Coming Soon
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground text-center">
              Want early access? Become a beta tester.
            </p>
            <div className="flex gap-2">
              <Input 
                placeholder="Enter beta invite code" 
                value={betaCode} 
                onChange={(e) => setBetaCode(e.target.value)}
                className="uppercase"
              />
              <Button onClick={handleRedeemBeta} disabled={betaLoading || !betaCode.trim()}>
                {betaLoading ? <Loader2 className="size-4 animate-spin" /> : "Redeem"}
              </Button>
            </div>
            {betaError && <p className="text-xs text-center text-destructive">{betaError}</p>}
            <p className="text-xs text-center text-muted-foreground mt-1">
              Don't have a code? <a href="mailto:advitya@work-ly.in?subject=Work-ly%20Beta%20Access%20Request" className="underline hover:text-primary transition-colors">Email us to request one.</a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
