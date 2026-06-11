import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./trpc"; // Base setup
import { db } from "./db";
import { households } from "./schema";
import { sql } from "drizzle-orm";

export const householdRouter = router({
  /**
   * CHECK PROMOTION STATUS
   * Returns how many free slots are remaining out of the 10,000 counter for marketing banners
   */
  getPromoStatus: publicProcedure.query(async () => {
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(households);
    const totalRegistered = countResult[0]?.count || 0;
    const slotsRemaining = Math.max(0, 10000 - totalRegistered);
    
    return {
      promoActive: totalRegistered < 10000,
      slotsRemaining: slotsRemaining,
      totalRegistered: totalRegistered
    };
  }),

  /**
   * CREATE HOUSEHOLD WITH AUTOMATIC 10K PROMO LOGIC
   */
  registerHousehold: protectedProcedure
    .input(z.object({
      streetAddress: z.string(),
      apartment: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Query current total subscription counts
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(households);
      const totalRegistered = countResult[0]?.count || 0;

      let tier = "basic";
      let billing = "active";

      // 2. Apply your 10,000 Early Adopter Business Rule
      if (totalRegistered < 10000) {
        // Automatically grant maximum access tier for complete household safety layout configurations
        tier = "family_plus"; 
        billing = "promotional_free_10k";
      }

      // 3. Commit the household into the encrypted database architecture
      const [newHousehold] = await db.insert(households).values({
        userId: ctx.user.id, // Pulled from your protected session token
        streetAddress: input.streetAddress,
        apartment: input.apartment,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        subscriptionTier: tier,
        billingStatus: billing
      }).returning();

      return {
        success: true,
        household: newHousehold,
        promotionalTierApplied: billing === "promotional_free_10k"
      };
    })
});
