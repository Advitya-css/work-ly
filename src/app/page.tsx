import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ComparisonSection } from "@/components/marketing/comparison-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { TrustSection } from "@/components/marketing/trust-section";
import { getFoundingOffer } from "@/lib/payments/founding";

// The founding offer's spots-left count comes from Polar; refresh it every 5 minutes.
export const revalidate = 300;

export default async function LandingPage() {
  const offer = await getFoundingOffer();
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
          <Hero offer={offer} />
          <TrustSection />
          <HowItWorks />
          <ComparisonSection />
          <CtaSection />
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}

