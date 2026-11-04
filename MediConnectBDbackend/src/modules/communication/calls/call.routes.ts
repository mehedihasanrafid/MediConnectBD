import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../../../utils/app-error";
import { createRateLimiter } from "../../../middlewares/rate-limit";
import { requireRole, type AuthenticatedLocals } from "../../auth/auth.middleware";
import type { CallService } from "./call.service";

export const conversationReference = z.string().regex(/^(direct:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const start = z.object({ conversationId: conversationReference, media: z.enum(["AUDIO", "VIDEO"]), idempotencyKey: z.string().uuid() }).strict();
export function createCallRouter(service: CallService | undefined, authenticate: RequestHandler) {
  const router = Router(), user = (locals: AuthenticatedLocals) => locals.authUser;
  const ready = () => { if (!service) throw new AppError(503, "CALLS_UNAVAILABLE", "Calls are unavailable"); return service; };
  router.get("/capabilities", authenticate, requireRole("PATIENT", "DOCTOR", "ADMIN"), (_req, res) => {
    res.json({ directMessaging: Boolean(service), callsAvailable: service?.available ?? false });
  });
  router.use("/calls", authenticate, requireRole("PATIENT", "DOCTOR", "ADMIN"));
  router.get("/calls/active", async (_req, res) => { res.json({ items: await ready().active(user(res.locals as AuthenticatedLocals)) }); });
  router.get("/calls", async (req, res) => {
    const query = z.object({ conversationId: conversationReference.optional() }).strict().parse(req.query);
    res.json({ items: await ready().history(user(res.locals as AuthenticatedLocals), query.conversationId) });
  });
  router.post("/calls", createRateLimiter({ windowMs: 60000, maxRequests: 10, keyPrefix: "call-start" }), async (req, res) => {
    const input = start.parse(req.body);
    res.status(201).json(await ready().start(user(res.locals as AuthenticatedLocals), input.conversationId, input.media, input.idempotencyKey));
  });
  router.get("/calls/:id", async (req, res) => {
    const service = ready(), actor = user(res.locals as AuthenticatedLocals);
    res.json(service.store.view(await service.store.get(z.string().uuid().parse(req.params.id), actor.id), new Date()));
  });
  router.post("/calls/:id/actions", async (req, res) => {
    const input = z.object({ action: z.enum(["accept", "decline", "cancel", "end"]) }).strict().parse(req.body);
    res.json(await ready().action(user(res.locals as AuthenticatedLocals), z.string().uuid().parse(req.params.id), input.action));
  });
  router.get("/calls/:id/room", async (req, res) => {
    res.set("Cache-Control", "no-store").json(await ready().room(user(res.locals as AuthenticatedLocals), z.string().uuid().parse(req.params.id)));
  });
  return router;
}
