"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPolarCheckout } from "@/lib/payments/polar";
import { getFoundingOfferAction, getPppContextAction, getSaleAction } from "@/lib/payments/founding-actions";
import { formatCents, saleEndDay, salePriceCents, type PublicSale } from "@/lib/payments/sale-core";
import { PAID_PLANS } from "@/lib/pricing";

const planFor = (interval: string) => PAID_PLANS.find((p) => p.interval === interval);
import { foundingSummary, type PublicFoundingOffer } from "@/lib/payments/founding-core";
import { formatDisplayPrice, type PublicPppContext } from "@/lib/payments/ppp-core";
import { redeemBetaCodeAction } from "@/lib/beta/actions";
import { BUSINESS, GUARANTEE, RECOMMENDED_BADGE } from "@/lib/business";

export function UpgradeModal({ 
  children,
  title = "Work-ly Pro",
  description = `Every AI career tool, with a ${GUARANTEE.sentence}.`,
  defaultPlan,
  preview,
}: { 
  children: React.ReactNode,
  title?: string,
  description?: string;
  defaultPlan?: "monthly" | "quarterly" | "yearly";
  /** What this tool would produce for the user, shown above the plans. */
  preview?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "yearly">(defaultPlan || "quarterly");
  const [betaCode, setBetaCode] = useState("");
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaError, setBetaError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [founding, setFounding] = useState<PublicFoundingOffer | null>(null);
  const [sale, setSale] = useState<PublicSale | null>(null);
  const [ppp, setPpp] = useState<PublicPppContext | null>(null);
  // A code box beside the pay button sends buyers off to hunt for codes,
  // so it only appears for someone who arrived on a code link (?code=).
  // Everyone else redeems at /redeem.
  const [codeFromLink, setCodeFromLink] = useState<string | null>(null);

  // The founding offer is read when the dialog opens, so its spots-left
  // count is current and closed dialogs cost nothing.
  useEffect(() => {
    if (!open) return;
    try {
      const fromLink = new URLSearchParams(window.location.search).get("code");
      if (fromLink) {
        setCodeFromLink(fromLink);
        setBetaCode(fromLink);
      }
    } catch {
      // no URL access: no code box
    }
    let cancelled = false;
    getFoundingOfferAction()
      .then((offer) => {
        if (!cancelled) setFounding(offer);
      })
      .catch(() => undefined);
    getSaleAction()
      .then((live) => {
        if (!cancelled) setSale(live);
      })
      .catch(() => undefined);
    getPppContextAction()
      .then((ctx) => {
        if (!cancelled) setPpp(ctx);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

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
      setCheckoutError("");
      const result = await createPolarCheckout(selectedPlan, { acceptedTerms: true });
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      // The server already words this for the buyer (lib/payments/checkout-errors.ts).
      setCheckoutError(result.error || "Checkout didn't open. Please try again in a minute.");
      setLoading(false);
    } catch (error) {
      console.error(error);
      // The call itself failed: usually a page opened before Work-ly was
      // updated (its server code moved on), sometimes a dropped connection.
      // A refresh fixes both.
      const msg = error instanceof Error ? error.message : "";
      setCheckoutError(
        /server action|failed to find|unexpected response|fetch/i.test(msg)
          ? "Work-ly was just updated. Refresh the page and try again."
          : "Couldn't reach Work-ly just now. Check your connection, refresh the page and try again.",
      );
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
          {preview}
          {sale && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
              <span className="font-semibold">{sale.name}:</span> the {planFor(sale.plan)?.name ?? "plan"} is{" "}
              {formatCents(salePriceCents(planFor(sale.plan)?.priceUsd ?? 0, sale))} until {saleEndDay(sale.endsAt)}. Applied
              automatically at checkout.
            </p>
          )}
          {founding && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
              <span className="font-semibold">Founding members:</span> {foundingSummary(founding, { forWhom: false })}.
              Applied automatically at checkout.
            </p>
          )}
          {ppp?.offer && (!founding || ppp.offer.percentOff >= founding.percentOff) && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
              <span className="font-semibold">Regional pricing ({ppp.countryName}):</span> {ppp.offer.percentOff}% off
              applied automatically at checkout.
            </p>
          )}
          {ppp && !ppp.covered && ppp.countryName && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
              Sorry, we don&apos;t cover {ppp.countryName} for local job discovery yet — coming soon. Pasting any job posting and remote checks still work everywhere.
            </p>
          )}
          <ul className="space-y-3 text-sm font-medium pb-2">
            {[
              "New jobs that fit you, with your resume, cover letter and note written overnight",
              "A resume rewritten for any job you add, as PDF or Word",
              "Likely interview questions and scored mock interviews",
              "Your LinkedIn headline and About, rewritten",
              "Unlimited job analyses and a plan to your dream job",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {(() => {
            const pppPct = ppp?.offer && (!founding || ppp.offer.percentOff >= founding.percentOff) ? ppp.offer.percentOff : 0;
            const displayCountry = ppp?.displayCountryCode ?? ppp?.countryCode ?? null;
            const monthly = formatDisplayPrice(19.99, pppPct, displayCountry);
            const quarterly = formatDisplayPrice(49.99, pppPct, displayCountry);
            const quarterlyPerMo = formatDisplayPrice(16.67, pppPct, displayCountry);
            const yearlyUsd =
              sale?.plan === "yearly"
                ? salePriceCents(planFor("yearly")?.priceUsd ?? 149.99, sale) / 100
                : 149.99;
            const yearly = formatDisplayPrice(yearlyUsd, sale?.plan === "yearly" ? 0 : pppPct, displayCountry);
            const monthlyFull = formatDisplayPrice(19.99, 0, displayCountry);
            const quarterlyFull = formatDisplayPrice(49.99, 0, displayCountry);
            const yearlyFull = formatDisplayPrice(sale?.plan === "yearly" ? 149.99 : 240, 0, displayCountry);
            return (
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
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1.5">
                  {pppPct > 0 && <span className="text-xs text-muted-foreground line-through">{monthlyFull.primary}</span>}
                  <span className="font-bold text-foreground">{monthly.primary}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
                </div>
                {monthly.isLocalCurrency && <span className="text-[11px] text-muted-foreground">{monthly.usd}/mo</span>}
              </div>
            </button>

            {/* Quarterly */}
            <button 
              onClick={() => setSelectedPlan("quarterly")}
              className={`relative flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${selectedPlan === "quarterly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
            >
              <div className="absolute -top-2.5 left-3 bg-primary-solid text-primary-solid-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="size-3 fill-current" /> {RECOMMENDED_BADGE}
              </div>
              <div className="flex flex-col mt-1">
                <span className="font-semibold text-foreground">3-Month Pass</span>
                <span className="text-xs text-muted-foreground">One-time payment</span>
              </div>
              <div className="flex flex-col items-end mt-1">
                <div className="flex items-baseline gap-1.5">
                  {pppPct > 0 && <span className="text-xs text-muted-foreground line-through">{quarterlyFull.primary}</span>}
                  <span className="font-bold text-foreground">{quarterly.primary}</span>
                </div>
                <span className="text-xs font-medium text-primary">
                  {quarterlyPerMo.primary}/mo{quarterly.isLocalCurrency ? ` (${quarterly.usd})` : ""}
                </span>
              </div>
            </button>

            {/* Yearly */}
            <button 
              onClick={() => setSelectedPlan("yearly")}
              className={`flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${selectedPlan === "yearly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Yearly Pass</span>
                <span className="text-xs text-muted-foreground">One-time payment · plus job watch, progress report and market value</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground line-through">
                    {sale?.plan === "yearly" || pppPct > 0 ? formatDisplayPrice(149.99, 0, displayCountry).primary : yearlyFull.primary}
                  </span>
                  <span className="font-bold text-foreground">{yearly.primary}</span>
                </div>
                <span className="text-xs font-medium text-green-600">
                  {pppPct > 0 && sale?.plan !== "yearly" ? `Save ${pppPct}%` : "Save 37%"}
                  {yearly.isLocalCurrency ? ` · ${yearly.usd}` : ""}
                </span>
              </div>
            </button>
            {quarterly.isLocalCurrency && (
              <p className="text-[11px] text-center text-muted-foreground">
                Prices shown in approximate {quarterly.currencyCode}; checkout settles in USD ({quarterly.usd} for 3 months).
              </p>
            )}
          </div>
            );
          })()}

          {checkoutError && <p role="alert" className="text-xs text-destructive">{checkoutError}</p>}

          <Button onClick={handleUpgrade} disabled={loading} size="lg" className="w-full mt-1 gap-2">
            {loading ? <WorklyLoader className="size-4 animate-spin" /> : <><Sparkles className="size-4" /> Continue to Checkout</>}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to the{" "}
            <a href="/legal/terms" target="_blank" rel="noopener" className="font-medium text-foreground underline underline-offset-2">
              Terms of Service
            </a>
            ,{" "}
            <a href="/legal/privacy" target="_blank" rel="noopener" className="font-medium text-foreground underline underline-offset-2">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/legal/refunds" target="_blank" rel="noopener" className="font-medium text-foreground underline underline-offset-2">
              Refund policy
            </a>
            . Pro starts straight away ({BUSINESS.refundDays}-day guarantee, up to {BUSINESS.refundUsageLimit} Pro AI tools used).
          </p>

          {codeFromLink && (
          <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground text-center">
              Got a code?
            </p>
            <div className="flex gap-2">
              <Input 
                placeholder="Enter code" 
                value={betaCode} 
                onChange={(e) => setBetaCode(e.target.value)}
                className="uppercase"
              />
              <Button onClick={handleRedeemBeta} disabled={betaLoading || !betaCode.trim()}>
                {betaLoading ? <WorklyLoader className="size-4 animate-spin" /> : "Redeem"}
              </Button>
            </div>
            {betaError && <p className="text-xs text-center text-destructive">{betaError}</p>}
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
