import { PageHeader } from "@/components/shared/page-header";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement | Work-ly",
  description: "Our commitment to digital accessibility.",
};

const markdown = `
**Last Updated**: September 1, 2026

Work-ly is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

### Conformance Status

We aim to conform to the **Web Content Accessibility Guidelines (WCAG) 2.1 level AA**. These guidelines explain how to make web content more accessible for people with disabilities and more user-friendly for everyone.

### Feedback and Contact

We welcome your feedback on the accessibility of Work-ly. If you encounter accessibility barriers, or need assistance using our platform, please let us know:

* **Email:** advityabansal2@gmail.com

We try to respond to feedback within 2 business days.
`;

export default function AccessibilityPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Accessibility Statement"
        description="Our commitment to making Work-ly usable by everyone."
      />
      <div className="prose prose-sm dark:prose-invert">
        <MarkdownRenderer content={markdown} />
      </div>
    </div>
  );
}
