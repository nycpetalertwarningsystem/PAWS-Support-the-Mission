import { drizzle } from "drizzle-orm/mysql2";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Creates a connection channel to your Google Cloud MySQL instance
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Secure cloud link initialized successfully.");
    } catch (error) {
      console.warn("[Database] Failed to connect to Cloud SQL instance:", error);
      _db = null;
    }
  }
  return _db;
}
