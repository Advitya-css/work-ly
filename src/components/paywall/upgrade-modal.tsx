"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCheckoutUrl } from "@/lib/payments/lemonsqueezy";
import { redeemBetaCodeAction } from "@/lib/beta/actions";

export function UpgradeModal({ 
  children,
  title = "Unlock Work-ly Pro",
  description = "Get the ultimate unfair advantage in your job hunt.",
  defaultPlan
}: { 
  children: React.ReactNode,
  title?: string,
  description?: string;
  defaultPlan?: "monthly" | "quarterly" | "yearly"
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "yearly">(defaultPlan || "quarterly");
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
        window.location.reload();
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
      const { url } = await createCheckoutUrl(selectedPlan);
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-md">
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
          <ul className="space-y-3 text-sm font-medium pb-2">
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>Unlimited AI Dream Job Analyses</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>AI Resume Tailoring (Pass ATS systems)</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>The Dream Pathway (30-day coaching)</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary shrink-0" /><span>Interview Simulator & Tech Sandbox</span></li>
          </ul>

          <div className="flex flex-col gap-2">
            {/* Monthly */}
            <button 
              onClick={() => setSelectedPlan("monthly")}
              className={`flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${selectedPlan === "monthly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Monthly</span>
                <span className="text-xs text-muted-foreground">Auto-renews</span>
              </div>
              <span className="font-bold text-foreground">$19.99<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
            </button>

            {/* Quarterly */}
            <button 
              onClick={() => setSelectedPlan("quarterly")}
              className={`relative flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${selectedPlan === "quarterly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
            >
              <div className="absolute -top-2.5 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="size-3 fill-current" /> Most popular
              </div>
              <div className="flex flex-col mt-1">
                <span className="font-semibold text-foreground">3-Month Pass</span>
                <span className="text-xs text-muted-foreground">One-time payment</span>
              </div>
              <div className="flex flex-col items-end mt-1">
                <span className="font-bold text-foreground">$49.99</span>
                <span className="text-xs font-medium text-primary">$16.67/mo</span>
              </div>
            </button>

            {/* Yearly */}
            <button 
              onClick={() => setSelectedPlan("yearly")}
              className={`flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${selectedPlan === "yearly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Yearly Pass</span>
                <span className="text-xs text-muted-foreground">One-time payment</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground line-through">$240</span>
                  <span className="font-bold text-foreground">$149.99</span>
                </div>
                <span className="text-xs font-medium text-green-600">Save 37%</span>
              </div>
            </button>
          </div>

          <Button disabled variant="outline" size="lg" className="w-full mt-2 gap-2 cursor-not-allowed">
            Public Checkouts Coming Soon
          </Button>

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
                {betaLoading ? <WorklyLoader className="size-4 animate-spin" /> : "Redeem"}
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
