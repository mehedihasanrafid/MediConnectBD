import { statSync } from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";

export function createFrontendRouter(directory: string) {
  const root = path.resolve(directory);
  const indexFile = path.join(root, "index.html");
  if (!statSync(indexFile, { throwIfNoEntry: false })?.isFile()) {
    throw new Error("React build is missing. Build the frontend and check FRONTEND_DIST_DIR.");
  }

  const router = express.Router();
  router.use(["/api", "/health", "/api-docs"], (_request, _response, next) => next("router"));
  router.use(helmet.contentSecurityPolicy({
    directives: {
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      frameSrc: ["'self'", "https://*.daily.co"],
    },
  }));
  router.use(express.static(root, { index: false, redirect: false }));
  router.use(["/assets", "/images"], (_request, _response, next) => next("router"));
  router.get("/{*path}", (request, response, next) => {
    if (path.posix.extname(request.path) || !request.accepts("html")) {
      next();
      return;
    }
    response.set("Cache-Control", "no-cache").sendFile(indexFile);
  });
  return router;
}
