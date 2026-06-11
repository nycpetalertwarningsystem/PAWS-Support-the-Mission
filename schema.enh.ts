// Add or modify these fields within your households table inside schema.ts
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("basic").notNull(), // basic, premium, family_plus
  
  // Track promotional status
  billingStatus: varchar("billing_status", { length: 50 }).default("active").notNull(), // active, canceled, promotional_free_10k
  
  streetAddress: varchar("street_address", { length: 255 }).notNull(),
  apartment: varchar("apartment", { length: 50 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }).notNull(),
  floorPlanUrl: text("floor_plan_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
