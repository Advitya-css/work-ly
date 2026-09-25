import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Work-ly for support, billing, refunds, privacy requests or complaints.",
};

const TOPICS = [
  {
    title: "Help with your account",
    body: "Questions about how a tool works, something that looks wrong, or trouble signing in.",
  },
  {
    title: "Billing and refunds",
    body: `Charges, cancellations and refunds. Every first purchase has a ${BUSINESS.refundDays}-day money-back guarantee.`,
    link: { href: "/legal/refunds", label: "Refund policy" },
  },
  {
    title: "Privacy and your data",
    body: "Access, correction, export or deletion of your data. You can also delete your data yourself in Settings.",
    link: { href: "/legal/privacy", label: "Privacy policy" },
  },
];

export default function ContactPage() {
  const mail = `mailto:${BUSINESS.supportEmail}`;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">Contact</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          A real person reads every message. We reply {BUSINESS.responseTime}.
        </p>
        <a
          href={mail}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-base font-medium text-foreground shadow-sm transition-colors hover:border-primary/40"
        >
          <Mail className="size-4 text-primary" aria-hidden />
          {BUSINESS.supportEmail}
        </a>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {TOPICS.map((topic) => (
          <div key={topic.title} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">{topic.title}</h2>
            <p className="text-sm text-muted-foreground">{topic.body}</p>
            {topic.link && (
              <Link href={topic.link.href} className="mt-auto text-sm font-medium text-primary underline-offset-4 hover:underline">
                {topic.link.label}
              </Link>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Complaints and grievance officer</h2>
        <p className="leading-relaxed text-muted-foreground">
          If something has gone wrong and our reply hasn&apos;t resolved it, write to our grievance officer. We acknowledge
          complaints within 48 hours and aim to resolve them within 30 days.
        </p>
        <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Grievance officer</dt>
          <dd className="text-foreground">{BUSINESS.operator}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>
            <a href={mail} className="text-foreground underline underline-offset-4">
              {BUSINESS.supportEmail}
            </a>
          </dd>
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Business details</h2>
        <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Operated by</dt>
          <dd className="text-foreground">{BUSINESS.operator} (sole proprietor)</dd>
          <dt className="text-muted-foreground">Trading as</dt>
          <dd className="text-foreground">
            {BUSINESS.product} ({BUSINESS.domain})
          </dd>
          {BUSINESS.address && (
            <>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-foreground">{BUSINESS.address}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Country</dt>
          <dd className="text-foreground">{BUSINESS.country}</dd>
        </dl>
      </section>
    </div>
  );
}
