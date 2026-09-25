/**
 * Work-ly's plans - the one source for the in-app pricing cards, the public
 * Pricing page and the Terms/Refund policy wording.
 */

export type PaidInterval = "monthly" | "quarterly" | "yearly";

export interface PaidPlan {
  interval: PaidInterval;
  name: string;
  tagline: string;
  price: string;
  priceUsd: number;
  priceSuffix?: string;
  compareAt?: string;
  note?: { text: string; tone: "primary" | "success" };
  /** How billing works, in one line. */
  terms: string;
  renews: boolean;
  /** Length of access. */
  term: string;
  features: string[];
  featured?: boolean;
}

export const PRO_FEATURES = [
  "Unlimited AI job analyses and fit scores",
  "Resumes and cover letters tailored to each job",
  "Mock interviews and practice tasks",
  "Unlimited dream-job analyses and step-by-step career plans",
  "Messages to hiring managers and likely interview questions",
];

export const FREE_FEATURES = [
  "Job matching with Candidate Fit scores",
  "Application tracker",
  "One free dream-job analysis",
  "Follow-up and counter-offer emails",
];

export const YEARLY_ONLY_FEATURES = [
  "Always-on job watch",
  "Monthly career progress report",
  "Your market value (real salary ranges)",
];

export const PAID_PLANS: PaidPlan[] = [
  {
    interval: "monthly",
    name: "Monthly",
    tagline: "Pay as you go",
    price: "$19.99",
    priceUsd: 19.99,
    priceSuffix: "/mo",
    terms: "Renews monthly. Cancel anytime.",
    renews: true,
    term: "1 month, renewing until cancelled",
    features: [
      "Unlimited AI job analyses",
      "Tailored resumes & cover letters",
      "Mock interviews & practice tasks",
      "Dream-job analyses & career plans",
      "14-day money-back guarantee",
    ],
  },
  {
    interval: "quarterly",
    name: "3-Month Pass",
    tagline: "Perfect for a focused job search",
    price: "$49.99",
    priceUsd: 49.99,
    note: { text: "Just $16.67/mo", tone: "primary" },
    terms: "One-time payment. No auto-renew.",
    renews: false,
    term: "3 months from purchase",
    features: ["Everything in Monthly, for 3 months", "No subscription to cancel", "14-day money-back guarantee"],
    featured: true,
  },
  {
    interval: "yearly",
    name: "Yearly Pass",
    tagline: "Keeps working after you're hired",
    price: "$149.99",
    priceUsd: 149.99,
    compareAt: "$240",
    note: { text: "Save 37%", tone: "success" },
    terms: "One-time payment. No auto-renew.",
    renews: false,
    term: "12 months from purchase",
    features: [
      "Everything in Monthly, for 12 months",
      "Yearly only: always-on job watch",
      "Yearly only: monthly career progress report",
      "Yearly only: your market value",
      "14-day money-back guarantee",
    ],
  },
];
