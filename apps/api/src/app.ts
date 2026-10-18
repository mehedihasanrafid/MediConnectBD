import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { requestId } from "./common/middleware/request-id";
import { createHealthRouter, type ReadinessChecks } from "./health/health.routes";

export interface AppOptions {
  appUrl: string;
  logLevel?: string;
  readiness: ReadinessChecks;
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
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_request, response) => {
    response.status(200).json({
      name: "MediConnect BD API",
      version: "0.1.0",
      documentation: "/api/v1",
    });
  });
  app.use("/health", createHealthRouter(options.readiness));

  app.use((_request, response) => {
    response.status(404).json({
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    });
  });

  app.use(
    (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
      response.status(500).json({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });

      if (process.env.NODE_ENV !== "test") {
        process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      }
    },
  );

  return app;
}
