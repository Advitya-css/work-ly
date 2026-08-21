import { Logo } from "@/components/shared/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo />
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Workly. Built for people, not resumes.
        </p>
      </div>
    </footer>
  );
}
