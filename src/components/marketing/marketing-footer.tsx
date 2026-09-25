import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { BUSINESS } from "@/lib/business";

const GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/free-grader", label: "Free resume grader" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/refunds", label: "Refund policy" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/cookies", label: "Cookies" },
      { href: "/legal/subprocessors", label: "Sub-processors" },
      { href: "/legal/accessibility", label: "Accessibility" },
    ],
  },
];

/**
 * Every public page carries who runs Work-ly and how to reach them - payment
 * providers check for exactly this when they review the site.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            AI career software for individuals. Work-ly doesn&apos;t charge employers, sell job listings or run ads.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Operated by {BUSINESS.operator}, sole proprietor, {BUSINESS.country}.
            {BUSINESS.address ? <><br />{BUSINESS.address}</> : null}
            <br />
            <a href={`mailto:${BUSINESS.supportEmail}`} className="underline-offset-4 hover:text-foreground hover:underline">
              {BUSINESS.supportEmail}
            </a>
          </p>
        </div>
        {GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-2 text-sm">
            <p className="font-medium text-foreground">{group.title}</p>
            {group.links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {BUSINESS.product}. Built for people, not resumes.
      </p>
    </footer>
  );
}
