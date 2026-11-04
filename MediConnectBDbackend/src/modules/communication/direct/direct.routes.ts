import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../../../utils/app-error";
import { createRateLimiter } from "../../../middlewares/rate-limit";
import { requireRole, type AuthenticatedLocals } from "../../auth/auth.middleware";
import { createMessageSchema, listMessagesQuerySchema } from "../communication.schema";
import { DirectMessages } from "./direct.messages";
import type { DirectStore } from "./direct.store";

const kind = z.enum(["SUPPORT", "COLLEAGUE", "STAFF"]);
const create = z.object({ kind, recipientId: z.string().uuid().optional() }).strict();
const query = z.object({ kind, search: z.string().trim().max(80).default("") }).strict();
export function createDirectRouter(store: DirectStore | undefined, authenticate: RequestHandler) {
  const router = Router();
  const actor = (locals: AuthenticatedLocals) => ({ id: locals.authUser.id, roles: locals.authUser.roles });
  const ready = () => {
    if (!store) throw new AppError(503, "DIRECT_MESSAGING_UNAVAILABLE", "Additional messaging is unavailable");
    return store;
  };
  router.use("/direct", authenticate, requireRole("PATIENT", "DOCTOR", "ADMIN"));
  router.get("/direct/contacts", async (request, response) => {
    const input = query.parse(request.query);
    response.json({ items: await ready().contacts(actor(response.locals as AuthenticatedLocals), input.kind, input.search) });
  });
  router.get("/direct/conversations", async (_request, response) => {
    response.json({ items: await ready().list(actor(response.locals as AuthenticatedLocals)) });
  });
  router.post("/direct/conversations", createRateLimiter({ windowMs: 60000, maxRequests: 20, keyPrefix: "direct-create" }), async (request, response) => {
    const input = create.parse(request.body);
    response.status(201).json(await ready().create(actor(response.locals as AuthenticatedLocals), input.kind, input.recipientId));
  });
  router.get("/direct/conversations/:id", async (request, response) => {
    response.json(await ready().detail(z.string().uuid().parse(request.params.id), actor(response.locals as AuthenticatedLocals)));
  });
  router.get("/direct/conversations/:id/messages", async (request, response) => {
    response.json(await new DirectMessages(ready()).list(z.string().uuid().parse(request.params.id),
      actor(response.locals as AuthenticatedLocals), listMessagesQuerySchema.parse(request.query)));
  });
  router.post("/direct/conversations/:id/messages", createRateLimiter({ windowMs: 60000, maxRequests: 60, keyPrefix: "direct-message" }), async (request, response) => {
    const result = await new DirectMessages(ready()).send(z.string().uuid().parse(request.params.id),
      actor(response.locals as AuthenticatedLocals), createMessageSchema.parse(request.body));
    response.status(result.replay ? 200 : 201).json(result.message);
  });
  return router;
}
