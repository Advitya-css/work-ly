import { PageHeader } from "@/components/shared/page-header";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Work-ly",
  description: "Work-ly subscription and refund policies.",
};

const markdown = `
**Last Updated**: September 25, 2026

### Billing & Passes

Work-ly Pro is offered in three tiers:
* **Monthly Subscription**: Billed as a recurring monthly subscription. It auto-renews until cancelled.
* **3-Month Pass**: A strict one-time payment for 3 months of access. It **does not** auto-renew.
* **Yearly Pass**: A strict one-time payment for 12 months of access. It **does not** auto-renew.

You can cancel the Monthly subscription at any time via your Work-ly Settings or the Lemon Squeezy portal. Your cancellation will take effect at the end of the current paid term.

### 14-Day Refund Policy

We want you to be fully satisfied with Work-ly. If you purchase any Pro plan or pass and find that it does not meet your expectations, we offer a **14-day money-back guarantee**. 

To request a refund within 14 days of your original purchase, simply email us at **advitya@work-ly.in**. We will process your refund no questions asked, provided your account has not engaged in abusive behavior or violated our Terms of Service (e.g., massive automated API scraping). 

After 14 days, payments are non-refundable unless required otherwise by applicable law.

### Merchant of Record

Our order process is conducted by our online reseller, **Lemon Squeezy**. Lemon Squeezy is the Merchant of Record for all our orders. They handle payment processing, global sales tax/VAT collection, and issue your invoices. All refunds are processed securely through Lemon Squeezy back to your original payment method.
`;

export default function RefundsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Refund Policy"
        description="Details about billing, passes, and our 14-day refund policy."
      />
      <div className="prose prose-sm dark:prose-invert">
        <MarkdownRenderer content={markdown} />
      </div>
    </div>
  );
}
