import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("health endpoints", () => {
  it("reports liveness without checking dependencies", async () => {
    const app = createApp({
      appUrl: "http://localhost:5173",
      logLevel: "silent",
      readiness: {
        database: async () => Promise.reject(new Error("not called")),
        redis: async () => Promise.reject(new Error("not called")),
      },
    });

    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "mediconnect-api" });
  });

  it("reports readiness when MySQL and Redis respond", async () => {
    const app = createApp({
      appUrl: "http://localhost:5173",
      logLevel: "silent",
      readiness: {
        database: async () => undefined,
        redis: async () => undefined,
      },
    });

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ready",
      dependencies: { database: "up", redis: "up" },
    });
  });

  it("fails readiness when a dependency is unavailable", async () => {
    const app = createApp({
      appUrl: "http://localhost:5173",
      logLevel: "silent",
      readiness: {
        database: async () => undefined,
        redis: async () => Promise.reject(new Error("Redis unavailable")),
      },
    });

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "not_ready",
      dependencies: { database: "up", redis: "down" },
    });
  });
});
