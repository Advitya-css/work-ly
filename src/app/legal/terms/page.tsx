import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { BUSINESS } from "@/lib/business";
import { PAID_PLANS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The agreement between you and Work-ly: plans, payments, refunds, acceptable use, liability and disputes.",
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="mt-4 text-2xl font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-foreground underline underline-offset-2">
    {children}
  </Link>
);

const Mail = () => (
  <a href={`mailto:${BUSINESS.supportEmail}`} className="text-foreground underline underline-offset-2">
    {BUSINESS.supportEmail}
  </a>
);

const TOC = [
  ["who", "1. Who we are and this agreement"],
  ["service", "2. What Work-ly is - and isn't"],
  ["accounts", "3. Eligibility and your account"],
  ["plans", "4. Plans, prices and payment"],
  ["cancel", "5. Renewals, cancellation and refunds"],
  ["codes", "6. Promotions, referrals and beta access"],
  ["fair-use", "7. Fair use of the AI tools"],
  ["content", "8. Your content"],
  ["ai", "9. AI output and scores"],
  ["third-party", "10. Job listings and third-party services"],
  ["conduct", "11. Acceptable use"],
  ["suspension", "12. Suspension and termination"],
  ["ip", "13. Our intellectual property and feedback"],
  ["disclaimers", "14. Disclaimers"],
  ["liability", "15. Limitation of liability"],
  ["indemnity", "16. Indemnity"],
  ["law", "17. Governing law and disputes"],
  ["changes", "18. Changes to the service and these Terms"],
  ["general", "19. General"],
  ["contact", "20. Contact and grievances"],
] as const;

export default function TermsOfService() {
  const monthly = PAID_PLANS.find((p) => p.interval === "monthly");
  const passes = PAID_PLANS.filter((p) => !p.renews);

  return (
    <div className="flex flex-col gap-5 leading-relaxed text-muted-foreground">
      <h1 className="mb-2 font-serif text-4xl text-foreground">Terms of Service</h1>
      <p className="text-sm italic">Last updated: {BUSINESS.legalUpdated}</p>

      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <p className="font-semibold text-foreground">The short version</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>Work-ly is AI career software for individuals. It is not a recruiter, job board or employer, and it can&apos;t guarantee you a job.</li>
          <li>Monthly renews until you cancel. The 3-Month and Yearly passes are one-time payments that don&apos;t renew.</li>
          <li>Your first purchase has a {BUSINESS.refundDays}-day money-back guarantee while you&apos;ve used fewer than {BUSINESS.refundUsageLimit} Pro AI tools (see the <A href="/legal/refunds">Refund policy</A>).</li>
          <li>Your resume and data stay yours. Always check AI-written content before you send it to anyone.</li>
          <li>Indian law applies, with courts in {BUSINESS.courts}, without taking away consumer rights you have where you live.</li>
        </ul>
        <p className="mt-2 text-xs">The short version is a summary. The full Terms below are what apply.</p>
      </div>

      <nav aria-label="Contents" className="text-sm">
        <p className="font-medium text-foreground">Contents</p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
          {TOC.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="underline-offset-2 hover:text-foreground hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="who" title="1. Who we are and this agreement">
        <p>
          These Terms of Service (&quot;Terms&quot;) are a legally binding agreement between you and {BUSINESS.operator}, an
          individual operating {BUSINESS.product} ({BUSINESS.domain}) as a sole proprietor in {BUSINESS.country}
          {BUSINESS.address ? ` (${BUSINESS.address})` : ""} (&quot;{BUSINESS.product}&quot;, &quot;we&quot;, &quot;us&quot;).
        </p>
        <p>
          By creating an account, buying a plan, or otherwise using {BUSINESS.product}, you agree to these Terms, our{" "}
          <A href="/legal/refunds">Refund policy</A>, <A href="/legal/privacy">Privacy policy</A> and{" "}
          <A href="/legal/cookies">Cookie policy</A>, which form part of this agreement. If you don&apos;t agree, don&apos;t
          use {BUSINESS.product}. If you use {BUSINESS.product} on behalf of an organisation, you confirm you&apos;re
          authorised to accept these Terms for it.
        </p>
      </Section>

      <Section id="service" title="2. What Work-ly is - and isn't">
        <p>
          {BUSINESS.product} is software that helps individuals manage their own careers: building a career profile from
          a resume, scoring how a profile matches roles the user is considering, drafting tailored resumes, cover letters
          and messages, interview practice, career planning, and tracking applications.
        </p>
        <p>
          {BUSINESS.product} is <strong className="text-foreground">not</strong> a recruiter, staffing or placement
          agency, employer, job board or advertising service. We don&apos;t charge employers, place candidates, take a fee
          when you&apos;re hired, or sell or advertise job listings. We don&apos;t guarantee any interview, job offer, salary or
          other outcome. Career guidance is general information, not professional career counselling or legal,
          immigration, tax or financial advice.
        </p>
      </Section>

      <Section id="accounts" title="3. Eligibility and your account">
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>You must be at least 18 years old and able to enter a binding contract.</li>
          <li>An account is for one person. Don&apos;t share your login or let others use your plan.</li>
          <li>Keep your information accurate and your password secure. You&apos;re responsible for activity on your account.</li>
          <li>Tell us straight away at <Mail /> if you think someone else has accessed your account.</li>
        </ul>
      </Section>

      <Section id="plans" title="4. Plans, prices and payment">
        <p>
          {BUSINESS.product} has a free plan and paid &quot;Pro&quot; plans. Current plans and prices are shown on our{" "}
          <A href="/pricing">Pricing page</A>:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          {monthly && (
            <li>
              <strong className="text-foreground">{monthly.name}</strong> ({monthly.price}
              {monthly.priceSuffix}) is a subscription. It renews automatically every month, and you&apos;re charged the
              then-current price at the start of each month, until you cancel.
            </li>
          )}
          {passes.map((plan) => (
            <li key={plan.interval}>
              <strong className="text-foreground">{plan.name}</strong> ({plan.price}) is a one-time payment for Pro
              access for {plan.term}. It does not renew and you won&apos;t be charged again. When it ends, your account
              returns to the free plan.
            </li>
          ))}
        </ul>
        <p>
          Some features are available only on particular plans (for example, the Yearly Pass perks). Plan contents are
          described on the Pricing page and in the app at the time you buy.
        </p>
        <p>
          <strong className="text-foreground">Prices and taxes.</strong> Prices are in US dollars unless shown otherwise at
          checkout. Sales tax, VAT or GST may be added at checkout depending on where you live. Your bank or card issuer
          may charge currency conversion or foreign transaction fees; those are between you and them.
        </p>
        <p>
          <strong className="text-foreground">Payment processing.</strong> Payments are processed by{" "}
          {BUSINESS.paymentProvider ? BUSINESS.paymentProvider : "our payment provider, named at checkout"}. We never see
          or store your full card details.{" "}
          {BUSINESS.providerIsMerchantOfRecord
            ? `${BUSINESS.paymentProvider} acts as the Merchant of Record: it is the seller of your order, collects any applicable taxes, issues your invoice, and its buyer terms also apply to your purchase.`
            : "Where a provider acts as a reseller (Merchant of Record) for your order, it is the seller of record, handles tax and invoicing, and its buyer terms also apply to your purchase."}
        </p>
        <p>
          <strong className="text-foreground">Price changes.</strong> We may change prices for future purchases. A price
          change never affects a period you&apos;ve already paid for. For Monthly, we&apos;ll email you at least 30 days
          before a new price applies to your renewal, so you can cancel first.
        </p>
        <p>
          <strong className="text-foreground">Failed payments.</strong> If a renewal payment fails, we or our payment
          provider may retry it. If it still can&apos;t be collected, Pro access ends and your account returns to the free
          plan.
        </p>
        <p>
          <strong className="text-foreground">Chargebacks.</strong> If there&apos;s a problem with a charge, please contact
          us first - most issues are fixed within a day. If you dispute a valid charge with your bank instead, we may
          suspend paid access while the dispute is open.
        </p>
      </Section>

      <Section id="cancel" title="5. Renewals, cancellation and refunds">
        <p>
          You can cancel Monthly at any time from Settings → Plan &amp; Billing, through the link in your payment receipt,
          or by emailing <Mail />. Cancellation stops future renewals; you keep Pro until the end of the month you&apos;ve
          already paid for. Passes don&apos;t renew, so there&apos;s nothing to cancel.
        </p>
        <p>
          Refunds are governed by our <A href="/legal/refunds">Refund policy</A>, including the {BUSINESS.refundDays}-day
          money-back guarantee on your first purchase. Nothing in these Terms limits any refund or cancellation right you
          have under mandatory consumer law where you live.
        </p>
      </Section>

      <Section id="codes" title="6. Promotions, referrals and beta access">
        <p>
          Promo codes, beta invite codes, referral rewards and free months have no cash value, can&apos;t be exchanged or
          transferred, and apply only as described when they&apos;re issued. We may change or end a promotion at any time,
          without affecting benefits already applied to your account. We may withdraw rewards obtained through fake
          accounts, self-referrals or other abuse.
        </p>
      </Section>

      <Section id="fair-use" title="7. Fair use of the AI tools">
        <p>
          &quot;Unlimited&quot; means unlimited for one person&apos;s normal use of their own career. To keep the service fast
          and affordable for everyone, we apply reasonable rate limits (for example, a number of AI requests per hour or
          discovery searches per day). If you reach a limit, the app tells you and it resets automatically. We may
          restrict accounts whose use is clearly automated or far beyond individual use.
        </p>
        <p>
          The free plan includes a daily allowance of AI checks (currently 15 a day, shown on the Pricing page). It
          refills within 24 hours. Paid plans have no daily allowance, only the fair-use limits above.
        </p>
      </Section>

      <Section id="content" title="8. Your content">
        <p>
          You own your resume, profile and everything else you submit (&quot;Your Content&quot;), and the drafts Work-ly
          produces for you are yours to use. You give us a limited, worldwide, non-exclusive licence to host, copy and
          process Your Content only to provide and improve the service for you, including sending it to the AI and
          infrastructure providers listed on our <A href="/legal/subprocessors">Sub-processors</A> page. We don&apos;t sell
          Your Content, and we don&apos;t use it to train AI models of our own. Our AI provider (Google&apos;s paid Gemini API) doesn&apos;t use it to train or improve its models either.
        </p>
        <p>
          You&apos;re responsible for having the right to upload Your Content. Don&apos;t upload other people&apos;s personal
          information without their permission. You can delete Your Content or your whole account at any time from
          Settings; deletion is permanent. How we handle personal data is explained in our{" "}
          <A href="/legal/privacy">Privacy policy</A>.
        </p>
      </Section>

      <Section id="ai" title="9. AI output and scores">
        <div className="border-l-4 border-warning bg-warning/10 py-1 pl-4 text-sm">
          <p className="mb-2">
            Candidate Fit, readiness and priority scores describe how your profile compares with a role&apos;s stated
            requirements. They are <strong className="text-foreground">not</strong> a prediction or promise of being
            shortlisted, interviewed or hired.
          </p>
          <p className="mb-2">
            AI-generated content - including resumes, cover letters, messages, interview feedback and data extracted from
            your resume - can be wrong or incomplete.{" "}
            <strong className="text-foreground">
              You&apos;re responsible for reviewing and correcting anything before you rely on it or send it to anyone.
            </strong>{" "}
            Only submit claims about yourself that are true.
          </p>
          <p>Salary figures shown are taken from third-party listings and are for information only.</p>
        </div>
      </Section>

      <Section id="third-party" title="10. Job listings and third-party services">
        <p>
          To help you match against roles, {BUSINESS.product} may show public job listings from third-party sources and
          licensed job-data providers, always with a link to the original. We don&apos;t create, verify, endorse or
          control those listings or the employers behind them, and we aren&apos;t responsible for their accuracy,
          availability or hiring decisions. Check details with the employer before applying, and never pay anyone for a
          job. Links to third-party sites and services are governed by their own terms.
        </p>
      </Section>

      <Section id="conduct" title="11. Acceptable use">
        <p>You agree not to:</p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Break any law, or use {BUSINESS.product} to create false, misleading or fraudulent applications or credentials.</li>
          <li>Impersonate anyone, or upload content you don&apos;t have the right to use.</li>
          <li>Share, resell, sublicense or rent access to your account or plan.</li>
          <li>Use bots, scripts or automated tools to access the service, or to apply to jobs at scale.</li>
          <li>Scrape, copy, reverse-engineer or extract our software, prompts, models or data, or build a competing product with them.</li>
          <li>Probe, overload or bypass our security, rate limits or access controls, or access another user&apos;s data.</li>
          <li>Upload malware, or content that is unlawful, hateful, harassing or infringing.</li>
        </ul>
      </Section>

      <Section id="suspension" title="12. Suspension and termination">
        <p>
          You can stop using {BUSINESS.product} and delete your account at any time. We may suspend or close an account,
          with notice where practical, if you seriously or repeatedly break these Terms, if required by law, or to prevent
          fraud or harm. If we close your account because you broke these Terms, you won&apos;t be entitled to a refund for
          the remaining paid period, except where the law requires one. If we stop offering {BUSINESS.product} altogether,
          we&apos;ll give at least 30 days&apos; notice and refund the unused part of any pass or subscription period, calculated
          pro rata.
        </p>
        <p>
          Sections 8 (licence for content already processed), 9, 13, 14, 15, 16, 17 and 19 survive termination.
        </p>
      </Section>

      <Section id="ip" title="13. Our intellectual property and feedback">
        <p>
          {BUSINESS.product}&apos;s software, design, text, branding and underlying technology belong to us or our
          licensors. We give you a personal, non-transferable, revocable licence to use the service under these Terms;
          nothing else is granted. If you send us ideas or feedback, you let us use them freely without obligation to you.
        </p>
      </Section>

      <Section id="disclaimers" title="14. Disclaimers">
        <p>
          To the fullest extent the law allows, {BUSINESS.product} is provided &quot;as is&quot; and &quot;as available&quot;,
          without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose,
          accuracy and non-infringement. We don&apos;t warrant that the service will be uninterrupted, error-free or secure,
          or that it will lead to any job, interview, offer or other outcome. Some countries don&apos;t allow these
          exclusions; where that&apos;s the case, they apply only as far as permitted.
        </p>
      </Section>

      <Section id="liability" title="15. Limitation of liability">
        <p>To the fullest extent the law allows:</p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            We aren&apos;t liable for indirect, incidental, special, consequential or punitive damages, or for lost
            earnings, lost job opportunities, lost profits or lost data, even if we were told they were possible.
          </li>
          <li>
            Our total liability for all claims relating to {BUSINESS.product} or these Terms is limited to the amount you
            paid us in the 12 months before the event giving rise to the claim, or US$50 if you haven&apos;t paid us
            anything.
          </li>
        </ul>
        <p>
          Nothing in these Terms excludes or limits liability that can&apos;t be excluded by law - such as liability for
          fraud, or for death or personal injury caused by negligence - or any mandatory right you have as a consumer.
        </p>
      </Section>

      <Section id="indemnity" title="16. Indemnity">
        <p>
          To the extent the law allows, you agree to cover our reasonable losses and costs (including legal fees) arising
          from content you submit, your breach of these Terms, or your violation of the law or anyone&apos;s rights. This
          doesn&apos;t apply to the extent a loss was caused by us.
        </p>
      </Section>

      <Section id="law" title="17. Governing law and disputes">
        <p>
          These Terms are governed by the laws of India. Before starting any formal proceedings, please email us at{" "}
          <Mail /> so we can try to resolve the issue informally within 30 days. If it isn&apos;t resolved, the courts at{" "}
          {BUSINESS.courts} have exclusive jurisdiction.
        </p>
        <p>
          If you&apos;re a consumer living outside India, you also keep the protection of the mandatory laws of your
          country of residence, and you may bring proceedings in your local courts where that law gives you that right.
          Nothing in this section takes those rights away.
        </p>
      </Section>

      <Section id="changes" title="18. Changes to the service and these Terms">
        <p>
          We improve {BUSINESS.product} constantly and may add, change or remove features. We won&apos;t materially reduce
          the core features of a plan during a period you&apos;ve already paid for.
        </p>
        <p>
          We may update these Terms. For material changes we&apos;ll give at least 14 days&apos; notice by email or in the
          app before they take effect. If you don&apos;t agree, you can cancel before then; if the change materially
          reduces what you paid for, you can ask for a pro rata refund of the unused period. Continuing to use{" "}
          {BUSINESS.product} after the changes take effect means you accept them.
        </p>
      </Section>

      <Section id="general" title="19. General">
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>These Terms and the policies they link to are the entire agreement between you and us about {BUSINESS.product}.</li>
          <li>If any part is found unenforceable, the rest stays in effect and that part is applied as far as the law allows.</li>
          <li>If we don&apos;t enforce a right straight away, we haven&apos;t waived it.</li>
          <li>You can&apos;t transfer these Terms without our consent. We may transfer them to a successor running {BUSINESS.product}, and we&apos;ll tell you if we do.</li>
          <li>We aren&apos;t responsible for delays or failures caused by events outside our reasonable control, such as outages at our providers, natural disasters or government action.</li>
          <li>These Terms are written in English; any translation is for convenience only.</li>
        </ul>
      </Section>

      <Section id="contact" title="20. Contact and grievances">
        <p>
          Questions, complaints or notices: <Mail />. We reply {BUSINESS.responseTime}. Our grievance officer is{" "}
          {BUSINESS.operator}, reachable at the same address; we acknowledge complaints within 48 hours and aim to resolve
          them within 30 days. More ways to reach us are on the <A href="/contact">Contact page</A>.
        </p>
      </Section>
    </div>
  );
}
