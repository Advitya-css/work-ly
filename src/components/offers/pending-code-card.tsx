import Link from "next/link";
import { cookies } from "next/headers";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { REDEEM_COOKIE, cleanRedeemCode } from "@/lib/redeem-cookie";

/**
 * "You have a code - redeem it." Shown on signed-in pages while a code
 * someone opened before signing up is still waiting (lib/redeem-cookie.ts),
 * so a coach's client or a gift recipient never loses it on the way
 * through sign-up, email verification and onboarding.
 */
export async function PendingCodeCard() {
  let code: string | null = null;
  try {
    code = cleanRedeemCode((await cookies()).get(REDEEM_COOKIE)?.value);
  } catch {
    code = null;
  }
  if (!code) return null;
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-foreground">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          You have a Work-ly code waiting: <span className="font-mono font-semibold">{code}</span>. Redeem it to switch on Pro.
        </span>
      </p>
      <Button asChild size="sm" className="shrink-0">
        <Link href={`/redeem?code=${encodeURIComponent(code)}`}>Redeem my code</Link>
      </Button>
    </div>
  );
}
