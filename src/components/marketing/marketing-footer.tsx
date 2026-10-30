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
      { href: "/sprint", label: "Application Sprint" },
      { href: "/gift", label: "Gift a pass" },
      { href: "/for-coaches", label: "For coaches" },
      { href: "/for-teams", label: "For bootcamps and career centres" },
      { href: "/partners", label: "Partner programme" },
    ],
  },
  {
    title: "Free tools",
    links: [
      { href: "/free-grader", label: "Job fit check" },
      { href: "/linkedin-headline-generator", label: "LinkedIn headline generator" },
      { href: "/resume-bullet-point-generator", label: "Resume bullet point generator" },
      { href: "/why-am-i-not-getting-interviews", label: "Why am I not getting interviews?" },
      { href: "/should-i-apply", label: "Should I apply for this job?" },
      { href: "/resume-job-match", label: "Resume vs job description" },
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
    <footer className="border-t border-border px-5 pb-10 pt-14 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Honest fit checks and applications written for each job, from your real experience. Work-ly doesn&apos;t
            charge employers, sell job listings or run ads.
          </p>
        </div>
        {GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-2.5 text-[13px]">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">{group.title}</p>
            {group.links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-2 border-t border-border pt-6 text-[12px] leading-relaxed text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {BUSINESS.product}. Operated by {BUSINESS.operator}, sole proprietor,{" "}
          {BUSINESS.address ? `${BUSINESS.address}.` : `${BUSINESS.country}.`}
        </p>
        <a href={`mailto:${BUSINESS.supportEmail}`} className="shrink-0 underline-offset-4 hover:text-foreground hover:underline">
          {BUSINESS.supportEmail}
        </a>
      </div>
    </footer>
  );
}
