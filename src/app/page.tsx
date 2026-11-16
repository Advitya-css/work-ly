import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { Hero } from "@/components/marketing/hero";
import { WhatYouGet } from "@/components/marketing/what-you-get";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { TrustSection } from "@/components/marketing/trust-section";
import { getFoundingOffer } from "@/lib/payments/founding";
import { getSale } from "@/lib/payments/sale";

// The founding offer's spots-left count comes from Polar; refresh it every 5 minutes.
export const revalidate = 300;

export default async function LandingPage() {
  const [offer, liveSale] = await Promise.all([getFoundingOffer(), getSale()]);
  // Never send the Polar discount id to the browser.
  const publicOffer = offer ? (({ discountId: _id, ...rest }) => rest)(offer) : null;
  const sale = liveSale ? (({ discountId: _omit, ...rest }) => rest)(liveSale) : null;
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
          <Hero offer={publicOffer} sale={sale} />
          <WhatYouGet />
          <TrustSection />
          <PricingTeaser offer={publicOffer} />
          <LandingFaq />
          <CtaSection />
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}

