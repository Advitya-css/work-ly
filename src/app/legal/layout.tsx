import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <MarketingNavbar />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
