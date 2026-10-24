/**
 * Serves local Swagger assets and the machine-readable specification.
 * Documentation is independent of MySQL/Redis check functions, but Try it out calls real APIs.
 * The CSP override is limited to this router so API-wide headers remain unchanged.
 */
import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi";

export function createOpenApiRouter(): Router {
  const router = Router();
  router.get(["/api-docs.json", "/openapi.json"], (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json(openApiDocument);
  });
  router.use("/api-docs", helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"], connectSrc: ["'self'"], objectSrc: ["'none'"],
        // Local HTTP documentation must not force its scripts to HTTPS.
        upgradeInsecureRequests: null,
      },
    },
  }), swaggerUi.serve, swaggerUi.setup(undefined, {
    swaggerUrl: "/openapi.json",
    customSiteTitle: "MediConnect BD API testing",
    swaggerOptions: {
      url: "/openapi.json", validatorUrl: null, persistAuthorization: false,
      withCredentials: true, displayRequestDuration: true, docExpansion: "none",
    },
  }));
  return router;
}
