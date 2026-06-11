// server/routers.ts
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { count, eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Central Operational Business Logic Router
  account: router({
    /**
     * Public route for landing page widgets displaying available promotional slots
     */
    getPromotionMetrics: publicProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { users } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) return { promoActive: false, remainingSlots: 0 };

      const totalUsers = await db.select({ value: count() }).from(users);
      const activeCount = totalUsers[0]?.value || 0;
      
      return {
        promoActive: activeCount < 10000,
        remainingSlots: Math.max(0, 10000 - activeCount),
        totalRegistered: activeCount
      };
    }),

    /**
     * Completes a profile with location attributes and checks for early adopter promotion eligibility
     */
    initializeHouseholdProfile: protectedProcedure
      .input(z.object({
        address: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        floorPlanUrl: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Google Cloud SQL Database connection unavailable.");

        // Check overall registered volume for the 10,000 threshold
        const totalUsers = await db.select({ value: count() }).from(users);
        const activeCount = totalUsers[0]?.value || 0;

        let appliedTier: "basic" | "family_plus" = "basic";
        let statusMarker = "active";

        // Apply promotion if slots are available
        if (activeCount < 10000) {
          appliedTier = "family_plus"; 
          statusMarker = "promotional_free_10k";
        }

        await db.update(users)
          .set({
            address: input.address,
            city: input.city,
            state: input.state,
            zipCode: input.zipCode,
            floorPlanUrl: input.floorPlanUrl || null,
            subscriptionTier: appliedTier,
            billingStatus: statusMarker
          })
          .where(eq(users.id, ctx.user.id));

        return {
          success: true,
          assignedTier: appliedTier,
          isPromotionalExempt: statusMarker === "promotional_free_10k"
        };
      }),
  }),

  // Special Needs Vulnerable Profile Management Layer
  vulnerableResidents: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { specialNeedsResidents } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) return null;
      
      return db.select()
        .from(specialNeedsResidents)
        .where(eq(specialNeedsResidents.userId, ctx.user.id));
    }),

    save: protectedProcedure
      .input(z.object({
        isOxygenDependent: z.boolean(),
        hasMobilityImpairment: z.boolean(),
        hasCognitiveChallenge: z.boolean(),
        rescueInstructions: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { specialNeedsResidents } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database link failed.");

        // Check if an entry already exists to perform an update or insert
        const existing = await db.select()
          .from(specialNeedsResidents)
          .where(eq(specialNeedsResidents.userId, ctx.user.id));

        const dataPayload = {
          userId: ctx.user.id,
          isOxygenDependent: input.isOxygenDependent ? 1 : 0,
          hasMobilityImpairment: input.hasMobilityImpairment ? 1 : 0,
          hasCognitiveChallenge: input.hasCognitiveChallenge ? 1 : 0,
          rescueInstructions: input.rescueInstructions
        };

        if (existing.length > 0) {
          return db.update(specialNeedsResidents)
            .set(dataPayload)
            .where(eq(specialNeedsResidents.userId, ctx.user.id));
        } else {
          return db.insert(specialNeedsResidents).values(dataPayload);
        }
      })
  }),

  pets: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getPetsByUserId } = await import("./db");
      return getPetsByUserId(ctx.user.id);
    }),
    get: protectedProcedure.input((z: any) => z.object({ petId: z.number() })).query(async ({ input }) => {
      const { getPetById } = await import("./db");
      return getPetById(input.petId);
    }),
    create: protectedProcedure
      .input((z: any) => z.object({
        name: z.string(),
        species: z.string(),
        breed: z.string().optional(),
        age: z.number().optional(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createPet } = await import("./db");
        return createPet({
          userId: ctx.user.id,
          ...input,
        });
      }),
    update: protectedProcedure
      .input((z: any) => z.object({
        petId: z.number(),
        name: z.string().optional(),
        species: z.string().optional(),
        breed: z.string().optional(),
        age: z.number().optional(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updatePet } = await import("./db");
        return updatePet(input.petId, input);
      }),
    delete: protectedProcedure
      .input((z: any) => z.object({ petId: z.number() }))
      .mutation(async ({ input }) => {
        const { deletePet } = await import("./db");
        return deletePet(input.petId);
      }),
  }),

  alerts: router({
    getThresholds: protectedProcedure
      .input((z: any) => z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        const { getAlertThresholdsByPetId } = await import("./db");
        return getAlertThresholdsByPetId(input.petId);
      }),
    setThreshold: protectedProcedure
      .input((z: any) => z.object({
        petId: z.number(),
        alertType: z.string(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        enabled: z.boolean().default(true),
        notificationMethods: z.array(z.string()).default(["in_app"]),
      }))
      .mutation(async ({ input }) => {
        const { createAlertThreshold } = await import("./db");
        return createAlertThreshold({
          petId: input.petId,
          alertType: input.alertType,
          minValue: input.minValue,
          maxValue: input.maxValue,
          enabled: input.enabled ? 1 : 0,
          notificationMethods: JSON.stringify(input.notificationMethods),
        });
      }),
    getHistory: protectedProcedure
      .input((z: any) => z.object({ petId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const { getAlertHistoryByPetId } = await import("./db");
        return getAlertHistoryByPetId(input.petId, input.limit);
      }),
    acknowledgeAlert: protectedProcedure
      .input((z: any) => z.object({ alertId: z.number() }))
      .mutation(async ({ input }) => {
        const { acknowledgeAlert } = await import("./db");
        return acknowledgeAlert(input.alertId);
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .input((z: any) => z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const { getNotificationsByUserId } = await import("./db");
        return getNotificationsByUserId(ctx.user.id, input.limit);
      }),
    markAsRead: protectedProcedure
      .input((z: any) => z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        const { markNotificationAsRead } = await import("./db");
        return markNotificationAsRead(input.notificationId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
