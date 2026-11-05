/**
 * Builds the Express application without opening a port. Middleware order matters: request IDs and
 * logging precede routes; not-found and error handlers run last. Tests inject routers and
 * readiness checks without connecting real infrastructure.
 */

import cors from "cors";
import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
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
import { createFrontendRouter } from "./routes/frontend";

export interface AppOptions {
  appUrl: string;
  logLevel?: string;
  pagesProxyKey?: string | undefined;
  readiness: ReadinessChecks;
  apiRouter?: Router;
  frontendDirectory?: string | undefined;
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
        "req.headers.x-mediconnect-proxy-key",
        "res.headers.set-cookie",
      ],
      serializers: {
        req: (request) => ({ method: request.method, url: request.url?.split("?")[0] }),
      },
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
  if (options.pagesProxyKey) {
    const expectedKey = Buffer.from(options.pagesProxyKey);
    app.use((request, response, next) => {
      const key = Buffer.from(request.get("x-mediconnect-proxy-key") ?? "");
      const ip = request.get("x-mediconnect-client-ip");
      if (ip && isIP(ip) && key.length === expectedKey.length && timingSafeEqual(key, expectedKey)) {
        response.locals.clientIp = ip;
      }
      next();
    });
  }

  if (!options.frontendDirectory) {
    app.get("/", (_request, response) => {
      response.status(200).json({
        name: "MediConnect BD API",
        version: "0.1.0",
        documentation: "/api-docs",
      });
    });
  }
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

  if (options.frontendDirectory) app.use(createFrontendRouter(options.frontendDirectory));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
