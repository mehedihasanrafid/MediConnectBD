/**
 * Mounts the protected /me endpoint without changing its established /api/v1 URL. Authentication
 * must run before the controller reads response.locals.
 */

import { Router, type RequestHandler } from "express";
import { getMyProfile } from "./user.controller";

export function createUserRouter(authenticate: RequestHandler): Router {
  const router = Router();
  router.get("/me", authenticate, getMyProfile);
  return router;
}
