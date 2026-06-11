import { z } from "zod";
import { router, protectedProcedure } from "./trpc"; // Assuming you have a base trpc setup
import { db } from "./db";
import { pets, alertThresholds, alertHistory, notifications } from "./schema";
import { eq, and, desc } from "drizzle-orm";

export const appRouter = router({
  // --- PETS ROUTER ---
  pets: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.select().from(pets).where(eq(pets.userId, ctx.user.id));
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        species: z.string(),
        breed: z.string().optional(),
        age: z.number().optional(),
        description: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const [result] = await db.insert(pets).values({
          userId: ctx.user.id,
          ...input
        });
        return result;
      }),
  }),

  // --- ALERTS ROUTER (Phase 4 & 5) ---
  alerts: router({
    getThresholds: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.select().from(alertThresholds).where(eq(alertThresholds.petId, input.petId));
      }),

    setThreshold: protectedProcedure
      .input(z.object({
        petId: z.number(),
        alertType: z.string(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const [result] = await db.insert(alertThresholds).values({
          petId: input.petId,
          alertType: input.alertType,
          minValue: input.minValue?.toString(),
          maxValue: input.maxValue?.toString(),
          enabled: input.enabled ? 1 : 0,
        }).onDuplicateKeyUpdate({
          set: {
            minValue: input.minValue?.toString(),
            maxValue: input.maxValue?.toString(),
            enabled: input.enabled ? 1 : 0,
          }
        });
        return result;
      }),

    getHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.select()
          .from(alertHistory)
          .where(eq(alertHistory.petId, input.petId))
          .orderBy(desc(alertHistory.createdAt));
      }),
      
    acknowledge: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input }) => {
        await db.update(alertHistory)
          .set({ acknowledged: 1, acknowledgedAt: new Date() })
          .where(eq(alertHistory.id, input.alertId));
        return { success: true };
      })
  }),

  // --- NOTIFICATIONS ROUTER ---
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt));
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.update(notifications)
          .set({ read: 1, readAt: new Date() })
          .where(eq(notifications.id, input.notificationId));
        return { success: true };
      })
  })
});

export type AppRouter = typeof appRouter;
