import type { ReactNode } from "react";

import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

/** Public pages (Pricing, About, Contact): open to everyone, no sign-in. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <MarketingNavbar />
      <main className="w-full flex-1 px-4 py-16 sm:px-6">{children}</main>
      <MarketingFooter />
    </div>
  );
}
