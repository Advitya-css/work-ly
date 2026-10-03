"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SIGNED_IN_HINT_COOKIE } from "@/lib/auth/constants";

/**
 * "Sign in / Start free", or "Open Work-ly" for someone already signed in.
 * Public pages are cached, so this reads the signed-in hint cookie in the
 * browser (see proxy.ts) instead of asking the server.
 */

function readSignedIn(): boolean {
  return document.cookie.split(";").some((c) => c.trim() === `${SIGNED_IN_HINT_COOKIE}=1`);
}

const noop = () => () => undefined;

export function useSignedInHint(): boolean {
  return useSyncExternalStore(noop, readSignedIn, () => false);
}

export function AccountButtons({ startLabel = "Start free", shortStartLabel = "Start" }: { startLabel?: string; shortStartLabel?: string }) {
  const signedIn = useSignedInHint();

  if (signedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/dashboard">
          Open Work-ly
          <ArrowRight />
        </Link>
      </Button>
    );
  }
  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/signup">
          <span className="hidden sm:inline">{startLabel}</span>
          <span className="inline sm:hidden">{shortStartLabel}</span>
        </Link>
      </Button>
    </>
  );
}
