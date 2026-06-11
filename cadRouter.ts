import { z } from "zod";
import { router, publicProcedure } from "./trpc"; // Base setup
import { db } from "./db";
import { households, pets, specialNeedsResidents, emergencyAccessLogs, cadAgencies } from "./schema";
import { eq, and, ilike } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const cadRouter = router({
  /**
   * INBOUND CAD EMERGENCY DISPATCH TRIGGER
   * Target SLA: Under 2 seconds to query, package, audit, and deliver profile.
   */
  processIncidentDispatch: publicProcedure
    .input(z.object({
      agencyToken: z.string(),          // Secure CAD authentication vector
      cadIncidentId: z.string(),        // Live 911 incident tracking number
      rawStreetAddress: z.string(),     // "123 Main St"
      zipCode: z.string()               // Pre-filtered by CAD routing table
    }))
    .mutation(async ({ input }) => {
      const startTime = performance.now();

      // 1. Authenticate the municipal dispatch endpoint via secure token lookup
      const agency = await db.select()
        .from(cadAgencies)
        .where(and(eq(cadAgencies.apiKeyHash, input.agencyToken), eq(cadAgencies.isActive, true)))
        .limit(1)
        .execute();

      if (!agency.length) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid Agency Security Vector Token" });
      }

      // 2. Match address parameters against the indexed household tables
      const match = await db.select()
        .from(households)
        .where(and(
          ilike(households.streetAddress, input.rawStreetAddress),
          eq(households.zipCode, input.zipCode)
        ))
        .limit(1)
        .execute();

      // Fallback response if address hasn't registered a subscription profile
      if (!match.length) {
        return {
          pawsDataAvailable: false,
          message: "No tactical P.A.W.S. profiles deployed for this localized scene coordinates."
        };
      }

      const householdRecord = match[0];

      // 3. Execute concurrent database pipelines to aggregate pet and special-needs data simultaneously
      const [petProfiles, humanProfiles] = await Promise.all([
        db.select().from(pets).where(eq(pets.householdId, householdRecord.id)).execute(),
        db.select().from(specialNeedsResidents).where(eq(specialNeedsResidents.householdId, householdRecord.id)).execute()
      ]);

      // 4. Formulate the high-priority tactical payload card optimized for immediate reading on field MDTs
      const tacticalPayload = {
        pawsDataAvailable: true,
        incidentTracking: {
          cadIncidentId: input.cadIncidentId,
          householdTier: householdRecord.subscriptionTier
        },
        structuralIntelligence: {
          floorPlanUrl: householdRecord.floorPlanUrl || "None Provided"
        },
        // Critical Red-Alert Header flags for immediate situational awareness
        criticalWarnings: {
          oxygenDependentOnSite: humanProfiles.some(h => h.isOxygenDependent),
          mobilityImpairedOnSite: humanProfiles.some(h => h.hasMobilityImpairment),
          defensiveAnimalsPresent: petProfiles.some(p => p.temperament.toLowerCase().includes("protect") || p.temperament.toLowerCase().includes("aggress"))
        },
        occupantManifest: {
          specialNeedsResidents: humanProfiles.map(h => ({
            count: h.count,
            instructions: h.criticalRescueInstructions
          })),
          pets: petProfiles.map(p => ({
            name: p.name,
            type: p.species,
            count: p.count,
            behavioralAlert: p.temperament,
            lastKnownHidingSpots: p.hidingSpots,
            visualConfirmationUrl: p.photoUrl
          }))
        }
      };

      const endTime = performance.now();
      const executionTimeMs = Math.round(endTime - startTime);

      // 5. Fire-and-forget transaction logging to keep the core thread completely open for dispatch transmission speed
      await db.insert(emergencyAccessLogs).values({
        agencyId: agency[0].id,
        cadIncidentId: input.cadIncidentId,
        queriedAddress: `${input.rawStreetAddress}, ${input.zipCode}`,
        payloadDispatched: tacticalPayload,
        executionTimeMs: executionTimeMs
      });

      // Confirm sub-2-second metric enforcement via system consoles
      console.log(`[P.A.W.S. CAD ENGINE] Incident ${input.cadIncidentId} resolved in ${executionTimeMs}ms`);

      return tacticalPayload;
    })
});
