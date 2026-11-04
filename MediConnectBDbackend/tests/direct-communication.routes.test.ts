import { randomUUID } from "node:crypto";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { createCommunicationRouter } from "../src/modules/communication/communication.routes";
import type { CommunicationService } from "../src/modules/communication/communication.service";
import type { DirectStore } from "../src/modules/communication/direct/direct.store";
import type { CallService } from "../src/modules/communication/calls/call.service";

function fixture() {
  const clinical = { listConversations: vi.fn().mockResolvedValue([]) };
  const direct = { list: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: `direct:${randomUUID()}` }) };
  const calls = { available: false, active: vi.fn().mockResolvedValue([]), start: vi.fn() };
  const authenticate: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role");
    if (!role) { res.status(401).json({ code: "AUTHENTICATION_REQUIRED" }); return; }
    res.locals.authUser = { id: randomUUID(), roles: [role], patientProfileId: randomUUID(), doctorProfile: null };
    next();
  };
  const router = Router();
  router.use("/communication", createCommunicationRouter(clinical as unknown as CommunicationService, authenticate,
    { direct: direct as unknown as DirectStore, calls: calls as unknown as CallService }));
  const app = createApp({ appUrl: "http://localhost:5173", logLevel: "silent", apiRouter: router,
    readiness: { database: async () => undefined, redis: async () => undefined } });
  return { app, clinical, direct, calls };
}

describe("Communication extension HTTP boundaries", () => {
  it("requires authentication for direct messaging, capabilities and incoming calls", async () => {
    const { app } = fixture();
    for (const path of ["direct/conversations", "capabilities", "calls/active"]) {
      expect((await request(app).get(`/api/v1/communication/${path}`)).status).toBe(401);
    }
  });
  it("lets admins use their direct inbox without granting clinical conversation access", async () => {
    const f = fixture();
    expect((await request(f.app).get("/api/v1/communication/direct/conversations").set("x-test-role", "ADMIN")).status).toBe(200);
    expect((await request(f.app).get("/api/v1/communication/conversations").set("x-test-role", "ADMIN")).status).toBe(403);
    expect(f.clinical.listConversations).not.toHaveBeenCalled();
    expect(f.direct.list).toHaveBeenCalledWith(expect.objectContaining({ roles: ["ADMIN"] }));
    const capabilities = await request(f.app).get("/api/v1/communication/capabilities").set("x-test-role", "ADMIN");
    expect(capabilities.body).toEqual({ directMessaging: true, callsAvailable: false });
  });
  it("rejects client-supplied membership and invalid call references before invoking services", async () => {
    const f = fixture();
    const create = await request(f.app).post("/api/v1/communication/direct/conversations").set("x-test-role", "PATIENT")
      .send({ kind: "SUPPORT", memberAId: randomUUID() });
    expect(create.status).toBe(422);
    expect(f.direct.create).not.toHaveBeenCalled();
    const call = await request(f.app).post("/api/v1/communication/calls").set("x-test-role", "DOCTOR")
      .send({ conversationId: "arbitrary-contact", media: "AUDIO", idempotencyKey: randomUUID() });
    expect(call.status).toBe(422);
    expect(f.calls.start).not.toHaveBeenCalled();
  });
});
