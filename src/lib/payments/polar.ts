"use server";

import { Polar } from "@polar-sh/sdk";
import { getCurrentUser } from "@/lib/auth";
import { POLAR_PRODUCT_IDS } from "@/lib/payments/polar-plans";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // We can pass organizationId if needed, but not strictly required if using default org for the token
});

const PRODUCT_IDS = POLAR_PRODUCT_IDS;

export async function createPolarCheckout(plan: "monthly" | "quarterly" | "yearly") {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Must be logged in to checkout");
    }

    const productId = PRODUCT_IDS[plan];
    if (!productId) {
      throw new Error("Invalid plan selected");
    }

    const result = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email,
      // Ties the Polar customer to this account, so renewals and refunds
      // map back to the right user even without checkout metadata.
      externalCustomerId: user.id,
      metadata: { user_id: user.id },
      customerMetadata: { user_id: user.id },
      customFieldData: { user_id: user.id },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://work-ly.in"}/dashboard?success=true`,
    });

    return { url: result.url };
  } catch (error: any) {
    console.error("Polar checkout error:", error);
    return { error: error.message || "Failed to create checkout" };
  }
}
