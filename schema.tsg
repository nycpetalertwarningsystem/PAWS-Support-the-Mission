import { pgTable, serial, varchar, text, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. HOUSEHOLDS / SUBSCRIPTION ACCOUNTS
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("basic").notNull(), // basic, premium, family_plus
  
  // Normalized Address fields heavily indexed for sub-2-second CAD location matching
  streetAddress: varchar("street_address", { length: 255 }).notNull(),
  apartment: varchar("apartment", { length: 50 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }).notNull(),
  
  // Structural documents (Premium / Family Plus tier)
  floorPlanUrl: text("floor_plan_url"), // S3 URL containing layout blueprints
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // GIN or B-Tree indexes on physical location data for instantaneous matching during 911 keying
  addressIdx: index("address_lookup_idx").on(table.streetAddress, table.zipCode),
}));

// 2. PET INCIDENT PROFILES
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  species: varchar("species", { length: 100 }).notNull(), // Dog, Cat, Exotic, etc.
  count: integer("count").default(1).notNull(), // Important for responder headcounts
  temperament: varchar("temperament", { length: 100 }).notNull(), // e.g., "Friendly", "Protective/Aggressive when panicked"
  hidingSpots: text("hiding_spots"), // Critical: "Hides under master bed", "Basement boiler room"
  photoUrl: text("photo_url"), // Visual confirmation for on-scene rescue
  wearableDeviceSync: jsonb("wearable_device_sync"), // Pulls latest tracking coordinates if integrated (Fi, Tractive)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. SPECIAL-NEEDS RESIDENTS (HIPAA Aligned & NYC Local Law 12 Compliant)
export const specialNeedsResidents = pgTable("special_needs_residents", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  count: integer("count").default(1).notNull(),
  // Strict classification markers used to toggle immediate high-visibility warnings on MDTs
  hasMobilityImpairment: boolean("has_mobility_impairment").default(false).notNull(),
  isOxygenDependent: boolean("is_oxygen_dependent").default(false).notNull(),
  hasCognitiveChallenge: boolean("has_cognitive_challenge").default(false).notNull(), // Autism, Alzheimer's (Non-verbal triggers)
  
  criticalRescueInstructions: text("critical_rescue_instructions").notNull(), // "First floor bedroom, non-verbal, do not yell"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. MUNICIPAL CAD INTEGRATIONS & RESPONDERS
export const cadAgencies = pgTable("cad_agencies", {
  id: serial("id").primaryKey(),
  agencyName: varchar("agency_name", { length: 100 }).notNull(), // e.g., "FDNY Dispatch", "NYCEM"
  apiKeyHash: text("api_key_hash").notNull(), // Secure hash of token used for CAD webhook calls
  isActive: boolean("is_active").default(true).notNull(),
});

// 5. MILITARY-GRADE AUDIT LOGS (Required for CJIS and HIPAA transmission alignment)
export const emergencyAccessLogs = pgTable("emergency_access_logs", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").references(() => cadAgencies.id),
  cadIncidentId: varchar("cad_incident_id", { length: 100 }).notNull(), // Link directly to the municipal 911 event ID
  queriedAddress: text("queried_address").notNull(),
  payloadDispatched: jsonb("payload_dispatched").notNull(), // Snapshot of what data was sent into the danger zone
  executionTimeMs: integer("execution_time_ms").notNull(), // SLA tracking to ensure < 2000ms response loop
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
