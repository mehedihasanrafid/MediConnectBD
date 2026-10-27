import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../src/middlewares/error-handler";
import { createRateLimiter } from "../src/middlewares/rate-limit";

describe("createRateLimiter", () => {
  it("allows requests within the window limit and returns 429 TOO_MANY_REQUESTS when exceeded", async () => {
    const app = express();
    app.use(
      "/limited",
      createRateLimiter({ windowMs: 60_000, maxRequests: 2, keyPrefix: "test" }),
      (_req, res) => {
        res.status(200).json({ ok: true });
      },
    );
    app.use(errorHandler);

    expect((await request(app).get("/limited")).status).toBe(200);
    expect((await request(app).get("/limited")).status).toBe(200);

    const blocked = await request(app).get("/limited");
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("TOO_MANY_REQUESTS");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });
});
