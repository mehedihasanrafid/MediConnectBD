/**
 * Family member route bindings. All routes require authentication and PATIENT role; ownership
 * validation happens in the service layer.
 */

import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import type { FamilyMemberService } from "./family-member.service";
import { createFamilyMemberController } from "./family-member.controller";

export function createFamilyMemberRouter(
  service: FamilyMemberService,
  authenticate: RequestHandler,
): Router {
  const controller = createFamilyMemberController({ familyMemberService: service });
  const router = Router();

  router.use(authenticate, requireRole("PATIENT"));

  router.get("/", controller.listByPatient);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.delete);

  return router;
}
