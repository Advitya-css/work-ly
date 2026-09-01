import { PageHeader } from "@/components/shared/page-header";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Work-ly",
  description: "Work-ly subscription and refund policies.",
};

const markdown = `
**Last Updated**: September 1, 2026

### Subscriptions & Auto-Renewal

Work-ly Pro is billed as a recurring subscription (monthly or yearly). When you subscribe, you agree that your payment method will be charged automatically at the start of each billing cycle. 

You can cancel your subscription at any time via the "Manage Subscription" link in your Work-ly Settings, or directly through the Lemon Squeezy portal. Your cancellation will take effect at the end of the current paid term.

### Refund Policy

Because our services involve immediate and intensive AI processing costs on our end, **all payments are generally non-refundable** unless required otherwise by applicable law (e.g., EU/UK statutory withdrawal rights where the service has not yet been utilized).

If you believe there was a billing error or a technical failure prevented you from accessing the service you paid for, please contact us immediately. We handle technical-failure refunds on a case-by-case basis.

### Merchant of Record

Our order process is conducted by our online reseller, **Lemon Squeezy**. Lemon Squeezy is the Merchant of Record for all our orders. They handle payment processing, sales tax collection, and issue your invoices.
`;

export default function RefundsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Refund & Subscription Policy"
        description="Details about billing, renewals, and refunds."
      />
      <div className="prose prose-sm dark:prose-invert">
        <MarkdownRenderer content={markdown} />
      </div>
    </div>
  );
}
