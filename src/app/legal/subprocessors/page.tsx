import { BUSINESS } from "@/lib/business";
import { PageHeader } from "@/components/shared/page-header";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Sub-processors",
  description: "Third-party services we use to process your data.",
};

const markdown = `
**Last Updated**: September 25, 2026

To provide Work-ly's services, we rely on a carefully selected group of third-party vendors who may process your personal data on our behalf ("Sub-processors"). We only partner with vendors who meet our strict security and privacy standards, including GDPR and DPDPA compliance.

### Infrastructure & Hosting

* **Vercel Inc.** (USA) – Cloud hosting and content delivery network.
* **Supabase** (USA) – Managed Postgres database and authentication provider.

### Core Service Providers

* **Resend** (USA) – Transactional email delivery (e.g., login codes, account notifications).
* **Payment provider** – payment processing${BUSINESS.paymentProvider ? `: **${BUSINESS.paymentProvider}**${BUSINESS.providerIsMerchantOfRecord ? " (Merchant of Record: sells on our behalf and handles billing, tax and invoices)" : ""}` : " (named at checkout; this entry will name it once live)"}.

### AI & Job Data Processing

* **Google LLC – Gemini API** (USA) – AI processing for resume reading, fit scoring, tailoring, interview practice and career planning. Only the text needed for the feature you use is sent, via the paid API. Under Google's paid-service terms, prompts and responses are not used to improve Google's products and are kept only for a limited period to detect abuse.
* **Adzuna / Jooble / Remotive / Jobicy / Arbeitnow** (Global) – Job listing data providers. We use these APIs to source job information, but we do not send your personal profile data to them.

### Updates to this list
We will update this list whenever we add or change a sub-processor.
`;

export default function SubprocessorsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Sub-processors"
        description="The trusted partners we use to run Work-ly."
      />
      <div className="prose prose-sm dark:prose-invert">
        <MarkdownRenderer content={markdown} />
      </div>
    </div>
  );
}
