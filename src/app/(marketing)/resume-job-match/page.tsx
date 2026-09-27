import type { Metadata } from "next";

import { ProblemLanding } from "@/components/marketing/problem-landing";
import { LANDING_PAGES } from "@/lib/landing-pages";

const page = LANDING_PAGES["resume-job-match"];

export const metadata: Metadata = {
  title: page.title,
  description: page.metaDescription,
  alternates: { canonical: `/${page.slug}` },
  openGraph: { title: page.title, description: page.metaDescription },
};

export default function Page() {
  return <ProblemLanding page={page} />;
}
