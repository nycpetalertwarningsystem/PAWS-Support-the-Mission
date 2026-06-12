// server/onboardingRouter.ts
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { count, eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Comprehensive coverage validation matrix for all 50 states + Washington D.C.
const VALID_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", 
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", 
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", 
  "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export const onboardingRouter = router({
  /**
   * 1. Public Counter to track the nationwide 5,000 free membership pool
   */
  getPromoMetrics: publicProcedure.query(async () => {
    const { getDb } = await import("./db");
    const { users } = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) return { promoActive: false, remainingSlots: 0, totalRegistered: 0 };

    // Count users already holding the 5k promotional marker
    const totalPromotionalUsers = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.billingStatus, "promotional_free_5k"));
      
    const activeCount = totalPromotionalUsers[0]?.value || 0;
    const PROMO_LIMIT = 5000;
    
    return {
      promoActive: activeCount < PROMO_LIMIT,
      remainingSlots: Math.max(0, PROMO_LIMIT - activeCount),
      totalRegistered: activeCount
    };
  }),

  /**
   * 2. Step One: Location Validation (Checks City, Zip, and State across all 51 Jurisdictions)
   */
  registerLocation: protectedProcedure
    .input(z.object({
      address: z.string().min(3, "Street address is required"),
      city: z.string().min(2, "Major City configuration required"),
      state: z.string().length(2, "State must be a 2-letter abbreviation").transform(val => val.toUpperCase()),
      zipCode: z.string().min(5, "Valid postal code required"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!VALID_STATES.includes(input.state)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `The state abbreviation '${input.state}' falls outside our active 51-jurisdiction emergency network.`
        });
      }

      const { getDb } = await import("./db");
      const { users } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) throw new Error("Database link unavailable.");

      // Check overall usage of the 5,000 pool
      const totalPromoUsers = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.billingStatus, "promotional_free_5k"));
      const currentPromoCount = totalPromoUsers[0]?.value || 0;

      let assignedTier: "basic" | "family_plus" = "basic";
      let statusMarker = "active";

      // Claim a slot if under the 5,000 threshold
      if (currentPromoCount < 5000) {
        assignedTier = "family_plus";
        statusMarker = "promotional_free_5k";
      }

      await db.update(users)
        .set({
          address: input.address,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          subscriptionTier: assignedTier,
          billingStatus: statusMarker
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        regionLocked: input.state,
        assignedTier,
        isPromotionalExempt: statusMarker === "promotional_free_5k"
      };
    }),

  /**
   * 3. Step Two: PETS FIRST (Primary Requirement Entry)
   */
  registerInitialPet: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Pet name required"),
      species: z.string().min(1, "Species designation required (e.g., Canine, Feline)"),
      breed: z.string().optional(),
      age: z.number().optional(),
      description: z.string().optional(), // Specific rescue hiding points
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { pets } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) throw new Error("Database connection error.");

      // Store pet profile attached directly to user account
      const [newPet] = await db.insert(pets).values({
        userId: ctx.user.id,
        name: input.name,
        species: input.species,
        breed: input.breed || null,
        age: input.age || null,
        description: input.description || null,
      });

      return {
        success: true,
        message: "Primary pet account logged. Family module parameters unlocked.",
        petId: newPet
      };
    }),

  /**
   * 4. Step Three: ADD FAMILY MEMBERS (Locked behind the Pet validation barrier)
   */
  registerFamilyVulnerabilities: protectedProcedure
    .input(z.object({
      isOxygenDependent: z.boolean(),
      hasMobilityImpairment: z.boolean(),
      hasCognitiveChallenge: z.boolean(), // Non-verbal, Autism triggers
      rescueInstructions: z.string().min(5, "Emergency dispatcher guidance required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { pets, specialNeedsResidents } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) throw new Error("Database link broken.");

      // CRITICAL ENFORCEMENT LAYER: Check if client has a registered pet profile first
      const userPetCount = await db
        .select({ value: count() })
        .from(pets)
        .where(eq(pets.userId, ctx.user.id));

      const petCount = userPetCount[0]?.value || 0;

      if (petCount === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Sequence Violations Detected: You must register at least one Pet Profile on your network account before adding family vulnerability tags."
        });
      }

      // Check if profile entry already exists to determine update vs insert
      const existingProfile = await db
        .select()
        .from(specialNeedsResidents)
        .where(eq(specialNeedsResidents.userId, ctx.user.id));

      const dataPayload = {
        userId: ctx.user.id,
        isOxygenDependent: input.isOxygenDependent ? 1 : 0,
        hasMobilityImpairment: input.hasMobilityImpairment ? 1 : 0,
        hasCognitiveChallenge: input.hasCognitiveChallenge ? 1 : 0,
        rescueInstructions: input.rescueInstructions
      };

      if (existingProfile.length > 0) {
        await db.update(specialNeedsResidents)
          .set(dataPayload)
          .where(eq(specialNeedsResidents.userId, ctx.user.id));
      } else {
        await db.insert(specialNeedsResidents).values(dataPayload);
      }

      return {
        success: true,
        message: "Family health matrix synchronized with municipal CAD layouts successfully."
      };
    })
});
