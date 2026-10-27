/**
 * Builds the Express application without opening a port. Middleware order matters: request IDs and
 * logging precede routes; not-found and error handlers run last. Tests inject routers and
 * readiness checks without connecting real infrastructure.
 */

import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import type { Router } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { errorHandler } from "./middlewares/error-handler";
import { notFound } from "./middlewares/not-found";
import { createRateLimiter } from "./middlewares/rate-limit";
import { requestId } from "./middlewares/request-id";
import { createOpenApiRouter } from "./docs/openapi.routes";
import { createHealthRouter, type ReadinessChecks } from "./modules/health/health.routes";

export interface AppOptions {
  appUrl: string;
  logLevel?: string;
  readiness: ReadinessChecks;
  apiRouter?: Router;
}

export function createApp(options: AppOptions): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(
    pinoHttp({
      level: options.logLevel ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
      ],
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: options.appUrl,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());

  app.get("/", (_request, response) => {
    response.status(200).json({
      name: "MediConnect BD API",
      version: "0.1.0",
      documentation: "/api-docs",
    });
  });
  app.use("/health", createHealthRouter(options.readiness));
  app.use(createOpenApiRouter());
  if (options.apiRouter) {
    const authLimiter = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 30,
      keyPrefix: "auth",
    });
    const verifyLimiter = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 60,
      keyPrefix: "verify",
    });
    app.use("/api/v1/auth/login", authLimiter);
    app.use("/api/v1/auth/patient/register", authLimiter);
    app.use("/api/v1/auth/doctor/register", authLimiter);
    app.use("/api/v1/prescriptions/verify", verifyLimiter);
    app.use("/api/v1", options.apiRouter);
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
