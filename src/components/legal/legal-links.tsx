import { FileText, RotateCcw, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The three documents a buyer agrees to, shown wherever someone is about to
 * pay: Terms of Service, Privacy Policy and Refund policy. They open in a
 * new tab so reading them never loses the checkout in progress.
 */
const LINKS = [
  { href: "/legal/terms", label: "Terms of Service", icon: FileText },
  { href: "/legal/privacy", label: "Privacy Policy", icon: ShieldCheck },
  { href: "/legal/refunds", label: "Refund policy", icon: RotateCcw },
];

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs", className)}>
      {LINKS.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <Icon className="size-3" aria-hidden />
          {label}
        </a>
      ))}
    </nav>
  );
}
