import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { AccountButtons } from "@/components/marketing/account-buttons";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/free-grader", label: "Free fit check" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" aria-label="Work-ly home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="md:hidden">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <AccountButtons />
        </div>
      </div>
    </header>
  );
}
