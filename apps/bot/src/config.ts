import { z } from "zod/v4";
import { config as dotenv } from "dotenv";
import path from "node:path";

dotenv({ path: path.resolve(process.cwd(), "../../.env") });

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_ENDPOINT: z.string().optional(),
  DUMP_CHANNEL_ID: z.string().min(1),
  GIPHY_API_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
