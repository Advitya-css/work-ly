import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Free resume checker: would a recruiter shortlist you?",
  description:
    "Paste a job description and your resume. Work-ly checks every key requirement, quotes the evidence it finds, and tells you what would get you screened out. Free, no signup.",
};

export default function FreeGraderLayout({ children }: { children: ReactNode }) {
  return children;
}
