import type { Metadata } from "next";

import { RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Redeem a code" };

/**
 * Where beta testers and partners' people redeem a code. Kept off the
 * checkout dialog on purpose: a "Got a code?" box next to the pay button
 * sends buyers away to search for one. Links look like /redeem?code=XYZ.
 */
export default async function RedeemPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Redeem a code</h1>
        <p className="text-sm text-muted-foreground">Enter the code you were given to unlock Work-ly Pro on this account.</p>
      </div>
      <RedeemForm initialCode={typeof code === "string" ? code.slice(0, 40) : ""} />
    </div>
  );
}
