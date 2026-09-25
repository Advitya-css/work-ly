import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PricingCard } from "@/components/paywall/pricing-card";

export const metadata = {
  title: "Pricing | Work-ly",
  description: "Simple, transparent pricing for your career growth.",
};

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col min-h-screen">
      <MarketingNavbar />
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-4">
        <div className="max-w-4xl w-full text-center mb-12">
          <h1 className="text-4xl font-serif text-foreground mb-4">Pricing that makes sense</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get unlimited access to the AI gap analyzer, automated resume tailoring, and interview prep tools.
          </p>
        </div>
        <div className="w-full max-w-5xl mx-auto">
          <PricingCard />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
