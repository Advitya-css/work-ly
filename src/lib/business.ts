/**
 * Who sells Work-ly, and the promises the legal pages make.
 *
 * One place, so the Terms, Refund policy, Pricing, About and Contact pages
 * can never disagree with each other - payment providers check exactly
 * that when they review an application.
 *
 * FILL IN `address` before applying to a payment provider: most of them
 * require a full postal address on the site. While it's empty, the pages
 * simply leave the address line out.
 */
export const BUSINESS = {
  product: "Work-ly",
  domain: "work-ly.in",
  url: "https://work-ly.in",
  /** The individual who operates Work-ly as a sole proprietor. */
  operator: "Advitya Bansal",
  /** Full postal address, e.g. "12 Example Road, Vaishali Nagar, Jaipur, Rajasthan 302021, India". */
  address: "Jaipur, Rajasthan, India", // TODO: Add your full street address here for Paddle verification
  country: "India",
  supportEmail: "advitya@work-ly.in",
  responseTime: "within 2 business days",
  /** Courts with exclusive jurisdiction under the Terms. */
  courts: "Jaipur, Rajasthan, India",
  /** Days after a first purchase in which a full refund is guaranteed. */
  refundDays: 14,
  /** The guarantee holds while the buyer has used fewer Pro AI tools than this (see lib/payments/refund-window.ts). */
  refundUsageLimit: 10,
  /**
   * The payment provider, once one is live (e.g. "Paddle", "Dodo Payments",
   * "Razorpay"), and whether it acts as Merchant of Record (the reseller
   * that is legally the seller and handles sales tax and invoices).
   */
  paymentProvider: "Polar",
  providerIsMerchantOfRecord: true,
  /** Shown as "Last updated" on the Terms and Refund policy. */
  legalUpdated: "26 September 2026",
} as const;

/**
 * How the guarantee is advertised. ALWAYS with its condition: a buyer who
 * read "money-back guarantee" and is then refused after 30 tool uses is
 * exactly the buyer who opens a payment dispute.
 */
export const GUARANTEE = {
  /** "14-day money-back guarantee if you've used fewer than 10 Pro tools" */
  sentence: `${BUSINESS.refundDays}-day money-back guarantee if you've used fewer than ${BUSINESS.refundUsageLimit} Pro tools`,
  /** "14-day money-back guarantee (under 10 Pro tools used)" - for feature lists. */
  feature: `${BUSINESS.refundDays}-day money-back guarantee (under ${BUSINESS.refundUsageLimit} Pro tools used)`,
} as const;

/** The badge on the plan we recommend. Not "Most popular" - that's a claim about sales. */
export const RECOMMENDED_BADGE = "Best for a job search";
