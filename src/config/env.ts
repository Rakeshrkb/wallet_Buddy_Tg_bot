import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  ETH_RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  ENCRYPTION_KEY_BASE64: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  API_KEYS: z.string().optional()
});

export const env = envSchema.parse(process.env);

export const apiKeys = new Set(
  env.API_KEYS?.split(",")
    .map((key) => key.trim())
    .filter(Boolean) ?? []
);
