import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, getAccessToken, setAccessToken } from "./client";

describe("api client single-flight refresh guard", () => {
  beforeEach(() => {
    setAccessToken("expired-token");
  });

  afterEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  it("triggers exactly one /auth/refresh request when two concurrent calls receive 401", async () => {
    let refreshCalls = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const authHeader = new Headers(init?.headers).get("Authorization");

      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return new Response(
          JSON.stringify({
            accessToken: "fresh-token",
            accessTokenExpiresIn: 900,
            tokenType: "Bearer",
            user: {
              id: "00000000-0000-4000-8000-000000000001",
              email: "patient@example.com",
              firstName: "Demo",
              lastName: "Patient",
              status: "ACTIVE",
              roles: ["PATIENT"],
              patientProfileId: "00000000-0000-4000-8000-000000000002",
              doctorProfile: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (authHeader === "Bearer expired-token") {
        return new Response(
          JSON.stringify({ code: "TOKEN_EXPIRED", message: "Access token expired" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      if (authHeader === "Bearer fresh-token") {
        return new Response(JSON.stringify({ items: [{ id: url }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "Unauthorized" }), {
        status: 401,
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const [resA, resB] = await Promise.all([
      api.get<{ items: Array<{ id: string }> }>("/appointments/me"),
      api.get<{ items: Array<{ id: string }> }>("/patients/me/family-members"),
    ]);

    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBe("fresh-token");
    expect(resA.items[0]?.id).toContain("/appointments/me");
    expect(resB.items[0]?.id).toContain("/patients/me/family-members");
  });
});
