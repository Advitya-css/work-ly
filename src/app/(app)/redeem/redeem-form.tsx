"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redeemBetaCodeAction } from "@/lib/beta/actions";

export function RedeemForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function redeem() {
    setError(null);
    startTransition(async () => {
      const result = await redeemBetaCodeAction(code);
      if (result?.error) setError(result.error);
      else router.push("/dashboard");
    });
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        redeem();
      }}
    >
      <Label htmlFor="code">Code</Label>
      <div className="flex gap-2">
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} className="uppercase" autoComplete="off" />
        <Button type="submit" disabled={pending || !code.trim()}>
          {pending ? "Checking…" : "Redeem"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
