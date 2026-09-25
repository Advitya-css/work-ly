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
  /**
   * The payment provider, once one is live (e.g. "Paddle", "Dodo Payments",
   * "Razorpay"), and whether it acts as Merchant of Record (the reseller
   * that is legally the seller and handles sales tax and invoices).
   */
  paymentProvider: "Polar",
  providerIsMerchantOfRecord: true,
  /** Shown as "Last updated" on the Terms and Refund policy. */
  legalUpdated: "25 September 2026",
} as const;
