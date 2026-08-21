import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ComparisonSection } from "@/components/marketing/comparison-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MarketingNavbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ComparisonSection />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
