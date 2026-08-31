import { Logo } from "@/components/shared/logo";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo />
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Work-ly. Built for people, not resumes.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/legal/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
