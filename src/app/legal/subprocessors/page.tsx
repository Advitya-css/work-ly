import { PageHeader } from "@/components/shared/page-header";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Sub-processors | Work-ly",
  description: "Third-party services we use to process your data.",
};

const markdown = `
**Last Updated**: September 1, 2026

To provide Work-ly's services, we rely on a carefully selected group of third-party vendors who may process your personal data on our behalf ("Sub-processors"). We only partner with vendors who meet our strict security and privacy standards, including GDPR and DPDPA compliance.

### Infrastructure & Hosting

* **Vercel Inc.** (USA) – Cloud hosting and content delivery network.
* **Supabase** (USA) – Managed Postgres database and authentication provider.

### Core Service Providers

* **Resend** (USA) – Transactional email delivery (e.g., login codes, account notifications).
* **Lemon Squeezy** (USA) – Merchant of Record and payment processing (handles billing and subscriptions).

### AI & Job Data Processing

* **OpenAI / Anthropic** (USA) – AI processing for gap analysis, resume tailoring, and interview simulation. Data sent to these providers is strictly via API and is explicitly opted-out of being used to train their models.
* **Adzuna / Remotive / Jobicy** (Global) – Job listing data providers. We use these APIs to source job information, but we do not send your personal profile data to them.

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
