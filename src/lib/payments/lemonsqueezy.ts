"use server";

import { createCheckout, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { getCurrentUser } from "@/lib/auth";

export async function createCheckoutUrl() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID;

  if (!apiKey || !variantId) {
    throw new Error("Missing Lemon Squeezy environment variables");
  }

  // Setup the SDK
  lemonSqueezySetup({
    apiKey,
    onError: (error) => console.error("Lemon Squeezy Error:", error),
  });

  try {
    // Generate a secure checkout session specifically for this user
    const checkout = await createCheckout(
      parseInt(process.env.LEMON_SQUEEZY_STORE_ID || "", 10), 
      parseInt(variantId, 10), 
      {
        checkoutOptions: {
          embed: false,
          media: true,
          logo: true,
        },
        checkoutData: {
          email: user.email,
          custom: {
            user_id: user.id, // This is crucial so the webhook knows who paid
          },
        },
        productOptions: {
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?success=true`,
          receiptButtonText: "Return to Workly",
        },
      }
    );

    if (checkout.error) {
      console.error(checkout.error);
      throw new Error("Failed to create checkout");
    }

    return { url: checkout.data?.data.attributes.url };
  } catch (error) {
    console.error(error);
    throw new Error("Something went wrong generating the checkout.");
  }
}
