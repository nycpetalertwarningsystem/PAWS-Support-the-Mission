import { mysqlTable, int, varchar, text, decimal, timestamp, json, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const pets = mysqlTable("pets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  species: varchar("species", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 255 }),
  age: int("age"),
  photoUrl: text("photoUrl"),
  description: text("description"),
  createdAt: timestamp("createdAt").default(sql`(now())`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`(now())`).onUpdateNow().notNull(),
});

export const alertThresholds = mysqlTable("alertThresholds", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  alertType: varchar("alertType", { length: 100 }).notNull(), // e.g., 'temperature', 'heart_rate'
  minValue: decimal("minValue", { precision: 10, scale: 2 }),
  maxValue: decimal("maxValue", { precision: 10, scale: 2 }),
  enabled: int("enabled").default(1).notNull(), // 1 for true, 0 for false
  notificationMethods: json("notificationMethods").default(['in_app']),
  createdAt: timestamp("createdAt").default(sql`(now())`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`(now())`).onUpdateNow().notNull(),
});

export const alertHistory = mysqlTable("alertHistory", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  alertType: varchar("alertType", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ['low', 'medium', 'high', 'critical']).notNull(),
  message: text("message").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  acknowledged: int("acknowledged").default(0).notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").default(sql`(now())`).notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  petId: int("petId").notNull(),
  alertHistoryId: int("alertHistoryId"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ['alert', 'info', 'warning', 'success']).default('alert'),
  read: int("read").default(0).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").default(sql`(now())`).notNull(),
});
