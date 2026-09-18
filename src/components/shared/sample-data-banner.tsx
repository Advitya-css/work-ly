import Link from "next/link";
import { FlaskConical } from "lucide-react";

/**
 * Shown across the app whenever the signed-in user's career profile is still
 * the onboarding "sample profile" (a fabricated Senior Product Manager
 * profile) rather than their own facts - see career-profile.isSampleData.
 * Disappears on its own the moment real data is saved, via
 * upsertCareerProfile clearing the flag; there's no dismiss button, because
 * the risk isn't that this is annoying, it's that fabricated data reads as
 * real everywhere else in the app (including anywhere it's later shared),
 * so it should stay visible for as long as it's still true.
 */
export function SampleDataBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-primary/20 bg-primary/5 px-4 py-2.5 text-center text-sm text-foreground">
      <span className="flex items-center gap-1.5 font-medium">
        <FlaskConical className="size-4 text-primary" />
        You're looking around with a sample profile
      </span>
      <span className="text-muted-foreground">
        Everything below is fake demo data, not yours.
      </span>
      <Link href="/career-profile" className="font-medium text-primary underline underline-offset-2 hover:no-underline">
        Upload your resume to replace it
      </Link>
    </div>
  );
}
