// P.A.W.S.live/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // Hardcoding or validating your main domain coordinates
  NEXT_PUBLIC_APP_URL: z.string().url().default("https://petalertwarningsys.com"),
  NEXT_PUBLIC_API_URL: z.string().url().default("https://api.petalertwarningsys.com"),
  
  // Stripe configuration keys (used once past the 10k free threshold)
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

export const env = envSchema.parse(process.env);
