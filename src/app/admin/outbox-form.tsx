"use client";

import { useActionState, useState } from "react";

import { sendOutreachAction } from "./actions";

/**
 * "Email someone": one personal email from advitya@work-ly.in through
 * Resend. The form keeps what you typed if sending fails, and clears the
 * message after a send so the next one starts fresh.
 */
export function OutboxForm({ adminKey, initialTo, addressOk }: { adminKey: string; initialTo: string; addressOk: boolean }) {
  const [state, action, pending] = useActionState(sendOutreachAction, null);
  const [kind, setKind] = useState<"user" | "cold">("user");
  const input = "rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600";

  return (
    <form action={action} key={state?.sent ?? "form"} className="flex flex-col gap-3">
      <input type="hidden" name="key" value={adminKey} />
      <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
        <label className="flex items-center gap-2">
          <input type="radio" name="kind" value="user" checked={kind === "user"} onChange={() => setKind("user")} />
          Someone who signed up
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="kind" value="cold" checked={kind === "cold"} onChange={() => setKind("cold")} />
          A coach or program (first email)
        </label>
      </div>
      {kind === "cold" && !addressOk && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          First emails to businesses should carry your full postal address (US anti-spam law). The site only has a city right
          now: add the street address to BUSINESS.address in src/lib/business.ts before sending these.
        </p>
      )}
      <input name="to" type="email" required defaultValue={state?.sent ? "" : initialTo} placeholder="Their email" className={input} />
      <input name="subject" required maxLength={150} placeholder="Subject" className={input} />
      <textarea
        name="body"
        required
        rows={10}
        maxLength={5000}
        placeholder={"Hi Jane,\n\n...\n\nAdvitya"}
        className={`${input} font-sans leading-relaxed`}
      />
      <p className="text-xs text-zinc-500">
        Sent from advitya@work-ly.in; replies come to your inbox. A footer is added automatically:{" "}
        {kind === "user" ? "an unsubscribe link" : "your name, address and \"reply no and I won't write again\""}.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {pending ? "Sending…" : "Send this email"}
        </button>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" name="repeat" /> send again anyway (already emailed today)
        </label>
      </div>
      {state?.sent && <p className="text-sm text-green-400">Sent to {state.sent}.</p>}
      {state?.error && (
        <p role="alert" className="text-sm text-amber-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
