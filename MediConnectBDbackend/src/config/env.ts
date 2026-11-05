/**
 * Loads the private backend-root .env for both source and compiled execution, then
 * validates configuration before startup. Payment credentials are optional as a group; no secrets
 * should be added to source or validation messages.
 */

import path from "node:path";
import { isIP } from "node:net";
import { X509Certificate } from "node:crypto";
import { config } from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "test" && process.env.RENDER !== "true") {
  const file = process.env.MEDICONNECT_ENV_FILE;
  const result = config({ path: file ?? path.resolve(__dirname, "../../.env"), quiet: true });
  if (file && result.error) throw new Error("Could not load the file specified by MEDICONNECT_ENV_FILE");
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RENDER: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default("http://localhost:5173"),
  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default("mediconnect"),
  DB_USER: z.string().min(1).default("mediconnect_app"),
  DB_PASSWORD: z.string().min(1),
  DB_SSL_CA: z.string().trim().min(1).transform((pem) => pem.replaceAll("\\n", "\n")).optional(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  PAGES_PROXY_KEY: z.string().min(32).optional(),
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
  DAILY_API_KEY: z.string().min(1).optional(),
  DAILY_DOMAIN: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().email().default("noreply@mediconnect.bd"),
}).superRefine((values, context) => {
  if (values.DB_SSL_CA) {
    try {
      const certificates = values.DB_SSL_CA.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
      if (!certificates) throw new Error("Missing certificate");
      for (const certificate of certificates) new X509Certificate(certificate);
    } catch {
      context.addIssue({ code: "custom", message: "Use the database CA certificate in PEM format", path: ["DB_SSL_CA"] });
    }
    if (isIP(values.DB_HOST)) {
      context.addIssue({ code: "custom", message: "Use the database hostname for TLS identity verification", path: ["DB_HOST"] });
    }
  }
  if (values.RENDER === "true") {
    if (values.NODE_ENV !== "production") {
      context.addIssue({ code: "custom", message: "Render requires production mode", path: ["NODE_ENV"] });
    }
    if (!values.DB_SSL_CA) {
      context.addIssue({ code: "custom", message: "Render requires a trusted MySQL CA certificate", path: ["DB_SSL_CA"] });
    }
    const app = URL.parse(values.APP_URL);
    if (!app || app.protocol !== "https:" || values.APP_URL !== app.origin) {
      context.addIssue({ code: "custom", message: "Use the exact HTTPS frontend origin, with no trailing slash", path: ["APP_URL"] });
    }
    const redis = URL.parse(values.REDIS_URL);
    if (!redis || !["redis:", "rediss:"].includes(redis.protocol) || !redis.hostname ||
      ["localhost", "127.0.0.1", "[::1]"].includes(redis.hostname)) {
      context.addIssue({ code: "custom", message: "Use your hosted Redis or Render Key Value URL", path: ["REDIS_URL"] });
    }
  }
  if (values.SSLCOMMERZ_STORE_ID || values.SSLCOMMERZ_STORE_PASSWORD) {
    if (!values.SSLCOMMERZ_STORE_ID || !values.SSLCOMMERZ_STORE_PASSWORD || !values.PUBLIC_API_URL) {
      context.addIssue({ code: "custom", message: "Set both sandbox store credentials and PUBLIC_API_URL", path: ["SSLCOMMERZ_STORE_ID"] });
    }
    const url = values.PUBLIC_API_URL ? URL.parse(values.PUBLIC_API_URL) : null;
    if (values.PUBLIC_API_URL && url?.protocol !== "https:") {
      context.addIssue({ code: "custom", message: "Payment callbacks require a public HTTPS URL", path: ["PUBLIC_API_URL"] });
    }
    if (url) {
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
