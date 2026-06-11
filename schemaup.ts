// P.A.W.S.live/schema.ts
import { pgTable, serial, varchar, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

// Users table matching your database migration sequence (0001_warm_lizard.sql, etc.)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Households containing structural attributes and address strings
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  streetAddress: varchar("street_address", { length: 255 }).notNull(),
  apartment: varchar("apartment", { length: 50 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }).notNull(),
  floorPlanUrl: text("floor_plan_url"), // Tactical blueprint attachments
  
  // Promotional & Tier Fields
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("basic").notNull(), // basic, premium, family_plus
  billingStatus: varchar("billing_status", { length: 50 }).default("active").notNull(), // active, promotional_free_10k, trialing
});

// Pet profiles containing behaviors and rescue spots
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  species: varchar("species", { length: 100 }).notNull(),
  count: integer("count").default(1).notNull(),
  temperament: varchar("temperament", { length: 255 }).notNull(), // e.g. "Aggressive when cornered"
  hidingSpots: text("hiding_spots"), // "Hides behind water heater in cellar"
});

// Vulnerable / Special-Needs Family Members (NYC Local Law 12 and HIPAA alignment)
export const specialNeedsResidents = pgTable("special_needs_residents", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  
  // Immediate CAD tactical alert toggles
  isOxygenDependent: boolean("is_oxygen_dependent").default(false).notNull(),
  hasMobilityImpairment: boolean("has_mobility_impairment").default(false).notNull(),
  hasCognitiveChallenge: boolean("has_cognitive_challenge").default(false).notNull(), // Non-verbal/Autism triggers
  
  rescueInstructions: text("rescue_instructions").notNull(), // "Bedbound in back bedroom upstairs"
});
