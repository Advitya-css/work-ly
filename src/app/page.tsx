import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { Hero } from "@/components/marketing/hero";
import { InteractiveDemo } from "@/components/marketing/interactive-demo";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ComparisonSection } from "@/components/marketing/comparison-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Work-ly",
    "alternateName": "Workly",
    "url": "https://work-ly.in/"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-1 flex-col">
        <MarketingNavbar />
        <main className="flex-1">
          <Hero />
          <InteractiveDemo />
          <HowItWorks />
          <ComparisonSection />
          <CtaSection />
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}

// Remove the old return since we replaced the whole block
