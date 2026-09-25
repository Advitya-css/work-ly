"use server";

import { Polar } from "@polar-sh/sdk";
import { getCurrentUser } from "@/lib/auth";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // We can pass organizationId if needed, but not strictly required if using default org for the token
});

const PRODUCT_IDS = {
  monthly: "e1ee10eb-0538-4363-99aa-a2d8141ec127",
  quarterly: "7e7f1dbc-9f22-44f9-bd6b-196911383dbe",
  yearly: "a42ffed2-dd57-4e6c-af7c-ba112e9ec43f",
};

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
