"use client";

import { useActionState } from "react";

import { checkoutCheckAction } from "./actions";

/** One button: is checkout working, and if not, what Polar actually says. */
export function CheckoutCheck({ adminKey }: { adminKey: string }) {
  const [rows, action, pending] = useActionState(checkoutCheckAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="key" value={adminKey} />
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Checking with Polar…" : "Run checkout check"}
      </button>
      {rows && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {rows.map((r) => (
            <li key={r.label} className="flex gap-2">
              <span className={r.ok ? "text-emerald-400" : "text-rose-400"}>{r.ok ? "OK" : "FAIL"}</span>
              <span className="shrink-0 font-medium text-white">{r.label}</span>
              <span className="text-zinc-400">{r.note}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
