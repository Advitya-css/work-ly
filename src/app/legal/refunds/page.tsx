import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { BUSINESS } from "@/lib/business";
import { PAID_PLANS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Refund policy",
  description: `Work-ly's ${BUSINESS.refundDays}-day money-back guarantee, cancellations, renewals and how refunds are paid.`,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="mt-4 text-2xl font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

const Mail = () => (
  <a href={`mailto:${BUSINESS.supportEmail}`} className="text-foreground underline underline-offset-2">
    {BUSINESS.supportEmail}
  </a>
);

export default function RefundsPage() {
  const days = BUSINESS.refundDays;
  const monthly = PAID_PLANS.find((p) => p.interval === "monthly");

  return (
    <div className="flex flex-col gap-5 leading-relaxed text-muted-foreground">
      <h1 className="mb-2 font-serif text-4xl text-foreground">Refund policy</h1>
      <p className="text-sm italic">Last updated: {BUSINESS.legalUpdated}</p>

      <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold text-foreground">{days}-day money-back guarantee</p>
          <p>
            If {BUSINESS.product} isn&apos;t right for you, email us within {days} days of your first purchase and we&apos;ll
            refund it in full. No questions, no forms.
          </p>
        </div>
      </div>

      <p>
        This policy is part of our <Link href="/legal/terms" className="text-foreground underline underline-offset-2">Terms of Service</Link>{" "}
        and applies to every paid plan: {PAID_PLANS.map((p) => `${p.name} (${p.price}${p.priceSuffix ?? ""})`).join(", ")}.
      </p>

      <Section title={`1. The ${days}-day guarantee`}>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            Applies to your <strong className="text-foreground">first purchase</strong> of any paid plan - the first
            Monthly payment, or your first 3-Month or Yearly Pass.
          </li>
          <li>
            Ask within <strong className="text-foreground">{days} days</strong> of the purchase date, by emailing <Mail /> from
            the address on your account (or including it). You don&apos;t need to give a reason.
          </li>
          <li>We refund the full amount you paid, including any tax charged, to your original payment method.</li>
          <li>Your account returns to the free plan when the refund is issued. Everything you created stays in your account.</li>
          <li>
            The guarantee is once per person. It doesn&apos;t apply to later purchases, renewals, or new accounts opened to
            use it again.
          </li>
        </ul>
      </Section>

      <Section title="2. After the guarantee period">
        <p>
          After {days} days, payments are non-refundable, including any unused time on a pass or a partly used month. We
          don&apos;t give partial refunds for switching plans or stopping early. The exceptions in section 4 always apply.
        </p>
      </Section>

      <Section title="3. Cancelling Monthly">
        <p>
          {monthly ? `${monthly.name} renews automatically every month until you cancel.` : "Monthly plans renew until cancelled."}{" "}
          Cancel anytime from Settings → Plan &amp; Billing, through the link in your payment receipt, or by emailing{" "}
          <Mail />. You keep Pro until the end of the month you&apos;ve paid for and won&apos;t be charged again. We send a
          receipt for every charge. If a renewal happened after you&apos;d cancelled, we&apos;ll refund it in full.
        </p>
        <p>
          The 3-Month and Yearly passes are one-time payments. They never renew, so there&apos;s nothing to cancel; they
          simply end.
        </p>
      </Section>

      <Section title="4. When we always refund">
        <p>Whatever the date, we&apos;ll refund or correct:</p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Duplicate charges, or charges for the wrong amount.</li>
          <li>A renewal charged after you cancelled.</li>
          <li>
            A paid feature being unavailable for more than 72 hours in a row because of a fault on our side - a pro rata
            refund or free extension for the time lost, your choice.
          </li>
          <li>Anything else the law where you live requires.</li>
        </ul>
      </Section>

      <Section title="5. How refunds are paid">
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>We confirm your request within 2 business days and issue the refund within 5 business days of approving it.</li>
          <li>
            Refunds go back to the original payment method. Your bank may take a further 5-10 business days to show it.
          </li>
          <li>
            We refund the amount charged in the currency charged. Differences from exchange rates or fees charged by your
            bank are outside our control.
          </li>
          <li>
            {BUSINESS.providerIsMerchantOfRecord && BUSINESS.paymentProvider
              ? `${BUSINESS.paymentProvider} sells on our behalf as Merchant of Record and issues refunds for us; you may also request one through them.`
              : "If a reseller (Merchant of Record) processed your order, it issues the refund on our behalf, and you may also request one through it."}
          </li>
        </ul>
      </Section>

      <Section title="6. Chargebacks">
        <p>
          Please contact us before disputing a charge with your bank - we&apos;re quick and you&apos;ll usually get your money
          back sooner. If a valid charge is disputed, paid access may be paused until the dispute is resolved.
        </p>
      </Section>

      <Section title="7. Abuse">
        <p>
          We may decline refunds where there&apos;s clear evidence of abuse, such as repeated buy-and-refund cycles or
          multiple accounts opened to reuse the guarantee. This never affects the refunds in section 4 or your legal rights.
        </p>
      </Section>

      <Section title="8. Your legal rights">
        <p>
          This policy adds to, and never reduces, any mandatory consumer rights you have where you live - for example,
          statutory rights to cancel a digital service or to a remedy for a faulty one.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Refund and billing questions: <Mail />. We reply {BUSINESS.responseTime}. See also our{" "}
          <Link href="/contact" className="text-foreground underline underline-offset-2">
            Contact page
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
