"use client";

import { useActionState, useState } from "react";

import { sendOutreachAction } from "./actions";
import { HEAT_LABEL, type Draft, type Heat } from "@/lib/founding-ten-core";

export interface QueueItem {
  userId: string;
  email: string;
  heat: Heat;
  draft: Draft;
  signedUp: string;
  jobsChecked: number;
}

const HEAT_TONE: Record<Heat, string> = {
  checkout: "bg-rose-500/15 text-rose-300",
  tried: "bg-amber-500/15 text-amber-300",
  checked: "bg-emerald-500/15 text-emerald-300",
  resume: "bg-sky-500/15 text-sky-300",
  signed_up: "bg-zinc-700/60 text-zinc-300",
};

/** One person: the email already written, editable, and a Send button. */
function Row({ item, adminKey }: { item: QueueItem; adminKey: string }) {
  const [state, action, pending] = useActionState(sendOutreachAction, null);
  const [open, setOpen] = useState(false);
  const input = "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white";

  if (state?.sent) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
        <span className="truncate text-zinc-400">{item.email}</span>
        <span className="shrink-0 text-emerald-400">Sent</span>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/60">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${HEAT_TONE[item.heat]}`}>{HEAT_LABEL[item.heat]}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-white">{item.email}</span>
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">
          joined {new Date(item.signedUp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          {item.jobsChecked > 0 ? ` · ${item.jobsChecked} job${item.jobsChecked === 1 ? "" : "s"} checked` : ""}
        </span>
        <span className="shrink-0 text-xs text-zinc-400">{open ? "Close" : "Review"}</span>
      </button>
      {open && (
        <form action={action} className="flex flex-col gap-3 border-t border-zinc-800 px-4 py-4">
          <input type="hidden" name="key" value={adminKey} />
          <input type="hidden" name="kind" value="user" />
          <input type="hidden" name="to" value={item.email} />
          <input name="subject" required maxLength={150} defaultValue={item.draft.subject} className={input} aria-label="Subject" />
          <textarea name="body" required rows={11} maxLength={5000} defaultValue={item.draft.body} className={`${input} leading-relaxed`} aria-label="Message" />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {pending ? "Sending…" : "Send"}
            </button>
            <span className="text-xs text-zinc-500">Edit anything first. It goes from advitya@work-ly.in with an unsubscribe link.</span>
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-amber-400">
              {state.error}
            </p>
          )}
        </form>
      )}
    </li>
  );
}

/**
 * THE FOUNDING TEN QUEUE: every free account worth a personal note, hottest
 * first, each with its email already written. Review, edit if you like,
 * press Send. Nothing goes out without that press.
 */
export function FoundingTenQueue({ items, adminKey }: { items: QueueItem[]; adminKey: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">Everyone has been emailed, has paid or has unsubscribed. Nice.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <Row key={item.userId} item={item} adminKey={adminKey} />
      ))}
    </ul>
  );
}
