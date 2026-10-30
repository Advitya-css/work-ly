import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { LandingFeatures, LandingFinalCta, LandingHero, LandingPricing, LandingPrinciples } from "@/components/landing/landing";
import { getFoundingOffer } from "@/lib/payments/founding";
import { getSale } from "@/lib/payments/sale";

// The founding offer's spots-left count comes from Polar; refresh it every 5 minutes.
export const revalidate = 300;

export default async function LandingPage() {
  const [offer, liveSale] = await Promise.all([getFoundingOffer(), getSale()]);
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
      {/* The landing page is always dark, like Linear's: one stage, whatever
          the visitor's system theme. Every other page follows their theme. */}
      <div className="dark flex flex-1 flex-col bg-background text-foreground [color-scheme:dark]">
        <MarketingNavbar />
        <main className="flex-1">
          <LandingHero offer={offer} sale={sale} />
          <LandingFeatures />
          <LandingPrinciples />
          <LandingPricing offer={offer} />
          <LandingFinalCta />
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}

