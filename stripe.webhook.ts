// P.A.W.S.live/stripe-webhook.ts
import { households } from "./schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

export async function handleSubscriptionDeletion(stripeSubscriptionId: string, householdId: number) {
  // Query targeted account attributes
  const [account] = await db.select().from(households).where(eq(households.id, householdId)).limit(1);

  if (account && account.billingStatus === "promotional_free_10k") {
    // SECURITY INTERCEPT: Do not downgrade or lock out accounts that belong to the initial 10,000 users.
    console.log(`[STRIPE BYPASS] Subscription event ignored for promotional founding member profile #${householdId}`);
    return;
  }

  // Otherwise, proceed with normal subscription suspension/downgrade logic for paid accounts
  await db.update(households)
    .set({ subscriptionTier: "basic", billingStatus: "canceled" })
    .where(eq(households.id, householdId));
}
