/**
 * Loads the private backend-root .env for both source and compiled execution, then
 * validates configuration before startup. Payment credentials are optional as a group; no secrets
 * should be added to source or validation messages.
 */

import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default("http://localhost:5173"),
  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default("mediconnect"),
  DB_USER: z.string().min(1).default("mediconnect_app"),
  DB_PASSWORD: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  SEED_DEMO_PASSWORD: z.string().min(8).optional().or(z.literal("")),
  SSLCOMMERZ_STORE_ID: z.string().min(1).optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().min(1).optional(),
  PUBLIC_API_URL: z.string().url().max(180).optional(),
}).superRefine((values, context) => {
  if (values.SSLCOMMERZ_STORE_ID || values.SSLCOMMERZ_STORE_PASSWORD) {
    if (!values.SSLCOMMERZ_STORE_ID || !values.SSLCOMMERZ_STORE_PASSWORD || !values.PUBLIC_API_URL) {
      context.addIssue({ code: "custom", message: "Set both sandbox store credentials and PUBLIC_API_URL", path: ["SSLCOMMERZ_STORE_ID"] });
    }
    if (values.PUBLIC_API_URL && new URL(values.PUBLIC_API_URL).protocol !== "https:") {
      context.addIssue({ code: "custom", message: "Payment callbacks require a public HTTPS URL", path: ["PUBLIC_API_URL"] });
    }
    if (values.PUBLIC_API_URL) {
      const url = new URL(values.PUBLIC_API_URL);
      if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
        context.addIssue({ code: "custom", message: "Use a public API origin without credentials, path, query, or fragment", path: ["PUBLIC_API_URL"] });
      }
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
