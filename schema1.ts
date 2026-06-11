import { decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow and subscription levels.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "responder"]).default("user").notNull(),
  
  // Tactical Dispatch Location Attributes
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 20 }),
  floorPlanUrl: text("floorPlanUrl"), // CDN structural blueprints URL

  // 10,000 Free Member Promotional State Trackers
  subscriptionTier: mysqlEnum("subscriptionTier", ["basic", "premium", "family_plus"]).default("basic").notNull(),
  billingStatus: varchar("billingStatus", { length: 100 }).default("active").notNull(), // "promotional_free_10k", "active", "canceled"
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Pets table - stores critical tracking metrics and rescue hiding behaviors
 */
export const pets = mysqlTable("pets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  species: varchar("species", { length: 100 }).notNull(), 
  breed: varchar("breed", { length: 255 }),
  age: int("age"), 
  photoUrl: text("photoUrl"), 
  description: text("description"), // Behaviors or specific evacuation hiding spots
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

/**
 * Special Needs & Vulnerable Residents Module (Aligned with CAD First-Responder views)
 */
export const specialNeedsResidents = mysqlTable("specialNeedsResidents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // High-Priority Tactical Safety Indicators (0 = False, 1 = True)
  isOxygenDependent: int("isOxygenDependent").default(0).notNull(),
  hasMobilityImpairment: int("hasMobilityImpairment").default(0).notNull(),
  hasCognitiveChallenge: int("hasCognitiveChallenge").default(0).notNull(), // Non-verbal, Autism triggers
  
  rescueInstructions: text("rescueInstructions").notNull(), // Emergency guidance
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpecialNeedsResident = typeof specialNeedsResidents.$inferSelect;
export type InsertSpecialNeedsResident = typeof specialNeedsResidents.$inferInsert;

/**
 * Alert thresholds - stores warning thresholds for connected IoT devices
 */
export const alertThresholds = mysqlTable("alertThresholds", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  alertType: varchar("alertType", { length: 100 }).notNull(), 
  minValue: decimal("minValue", { precision: 10, scale: 2 }),
  maxValue: decimal("maxValue", { precision: 10, scale: 2 }),
  enabled: int("enabled").default(1).notNull(), 
  notificationMethods: json("notificationMethods").default(JSON.stringify(["in_app"])), 
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Alert history - logs all triggered alerts for each pet
 */
export const alertHistory = mysqlTable("alertHistory", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  alertType: varchar("alertType", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  message: text("message").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }), 
  acknowledged: int("acknowledged").default(0).notNull(), 
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Notifications - in-app notifications for the user
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  petId: int("petId").notNull(),
  alertHistoryId: int("alertHistoryId"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["alert", "info", "warning", "success"]).default("alert"),
  read: int("read").default(0).notNull(), 
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Table Relationships Data Layer Mapping
 */
export const usersRelations = relations(users, ({ many }) => ({
  pets: many(pets),
  notifications: many(notifications),
  specialNeeds: many(specialNeedsResidents),
}));

export const specialNeedsRelations = relations(specialNeedsResidents, ({ one }) => ({
  user: one(users, {
    fields: [specialNeedsResidents.userId],
    references: [users.id],
  }),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
  user: one(users, {
    fields: [pets.userId],
    references: [users.id],
  }),
  alertThresholds: many(alertThresholds),
  alertHistory: many(alertHistory),
  notifications: many(notifications),
}));
