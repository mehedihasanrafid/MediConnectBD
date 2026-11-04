/**
 * Express router for Communication module.
 * Mounts:
 * - GET  /api/v1/communication/conversations
 * - GET  /api/v1/communication/conversations/:id
 * - GET  /api/v1/communication/conversations/:id/messages
 * - POST /api/v1/communication/conversations/:id/messages
 */

import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import { createCommunicationController } from "./communication.controller";
import type { CommunicationService } from "./communication.service";
import type { DirectStore } from "./direct/direct.store";
import type { CallService } from "./calls/call.service";
import { createDirectRouter } from "./direct/direct.routes";
import { createCallRouter } from "./calls/call.routes";

export function createCommunicationRouter(
  communicationService: CommunicationService,
  authenticate: RequestHandler,
  extensions: { direct?: DirectStore | undefined; calls?: CallService | undefined } = {},
): Router {
  const controller = createCommunicationController({ communicationService });
  const router = Router();
  router.use(createDirectRouter(extensions.direct, authenticate));
  router.use(createCallRouter(extensions.calls, authenticate));

  router.get(
    "/conversations",
    authenticate,
    requireRole("PATIENT", "DOCTOR"),
    controller.listConversations.bind(controller),
  );

  router.get(
    "/conversations/:id",
    authenticate,
    requireRole("PATIENT", "DOCTOR"),
    controller.getConversation.bind(controller),
  );

  router.get(
    "/conversations/:id/messages",
    authenticate,
    requireRole("PATIENT", "DOCTOR"),
    controller.listMessages.bind(controller),
  );

  router.post(
    "/conversations/:id/messages",
    authenticate,
    requireRole("PATIENT", "DOCTOR"),
    controller.sendMessage.bind(controller),
  );

  return router;
}
