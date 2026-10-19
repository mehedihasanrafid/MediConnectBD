import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DoctorApplicationStatus } from "../src/modules/doctors/doctor-profile.entity";
import { AccessTokenService } from "../src/modules/auth/access-token.service";
import type { AuthRepository } from "../src/modules/auth/auth.repository";
import { AuthService } from "../src/modules/auth/auth.service";
import type {
  AuthUser,
  DoctorRegistration,
  NewRefreshSession,
  PatientRegistration,
  RotationResult,
} from "../src/modules/auth/auth.types";
import type { PasswordHasher } from "../src/modules/auth/password-hasher";

interface StoredSession extends NewRefreshSession {
  id: string;
  revoked: boolean;
}

class FakeAuthRepository implements AuthRepository {
  users = new Map<string, AuthUser>();
  sessions = new Map<string, StoredSession>();

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) ?? null;
  }

  async createPatient(input: PatientRegistration, passwordHash: string): Promise<AuthUser> {
    const user: AuthUser = {
      id: randomUUID(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      status: "ACTIVE",
      roles: ["PATIENT"],
      patientProfileId: randomUUID(),
      doctorProfile: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async createDoctor(input: DoctorRegistration, passwordHash: string): Promise<AuthUser> {
    const user: AuthUser = {
      id: randomUUID(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      status: "ACTIVE",
      roles: ["DOCTOR"],
      patientProfileId: null,
      doctorProfile: {
        id: randomUUID(),
        applicationStatus: DoctorApplicationStatus.DRAFT,
      },
    };
    this.users.set(user.id, user);
    return user;
  }

  async createRefreshSession(input: NewRefreshSession): Promise<string> {
    const id = randomUUID();
    this.sessions.set(input.tokenHash, { ...input, id, revoked: false });
    return id;
  }

  async rotateRefreshSession(
    currentTokenHash: string,
    replacement: Omit<NewRefreshSession, "userId">,
    now: Date,
  ): Promise<RotationResult> {
    const current = this.sessions.get(currentTokenHash);
    if (!current) return { kind: "INVALID" };
    if (current.revoked) return { kind: "REUSED" };
    if (current.expiresAt <= now) return { kind: "EXPIRED" };
    const user = this.users.get(current.userId);
    if (!user || user.status !== "ACTIVE") return { kind: "BLOCKED" };

    current.revoked = true;
    const id = randomUUID();
    this.sessions.set(replacement.tokenHash, {
      ...replacement,
      userId: current.userId,
      id,
      revoked: false,
    });
    return { kind: "ROTATED", user, sessionId: id };
  }

  async revokeRefreshSession(tokenHash: string): Promise<void> {
    const session = this.sessions.get(tokenHash);
    if (session) session.revoked = true;
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  verify: async (password, passwordHash) => passwordHash === `hashed:${password}`,
};

const context = { userAgent: "test", ipAddress: "127.0.0.1" };

function createService(repository: FakeAuthRepository, now = new Date("2026-10-18T12:00:00Z")) {
  return new AuthService(
    repository,
    passwordHasher,
    new AccessTokenService("test-secret-with-at-least-32-characters", 900),
    30,
    () => now,
  );
}

describe("AuthService", () => {
  it("registers a patient and stores only a hash of the refresh token", async () => {
    const repository = new FakeAuthRepository();
    const service = createService(repository);

    const result = await service.registerPatient(
      {
        email: "patient@example.com",
        password: "StrongPassword123",
        firstName: "Test",
        lastName: "Patient",
      },
      context,
    );

    expect(result.user.roles).toEqual(["PATIENT"]);
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.accessToken).toBeTruthy();
    const tokenHash = createHash("sha256").update(result.refreshToken).digest("hex");
    expect(repository.sessions.has(tokenHash)).toBe(true);
    expect(repository.sessions.has(result.refreshToken)).toBe(false);
  });

  it("denies login for a suspended account", async () => {
    const repository = new FakeAuthRepository();
    const user = await repository.createPatient(
      {
        email: "suspended@example.com",
        password: "unused",
        firstName: "Suspended",
        lastName: "User",
      },
      "hashed:StrongPassword123",
    );
    user.status = "SUSPENDED";
    const service = createService(repository);

    await expect(
      service.login(
        { email: user.email, password: "StrongPassword123" },
        context,
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: "ACCOUNT_SUSPENDED" });
  });

  it("rotates refresh tokens and detects reuse of the old token", async () => {
    const repository = new FakeAuthRepository();
    const service = createService(repository);
    const registered = await service.registerDoctor(
      {
        email: "doctor@example.com",
        password: "StrongPassword123",
        firstName: "Test",
        lastName: "Doctor",
        bmdcNumber: "DEMO-123",
      },
      context,
    );

    const refreshed = await service.refresh(registered.refreshToken, context);

    expect(refreshed.refreshToken).not.toBe(registered.refreshToken);
    await expect(service.refresh(registered.refreshToken, context)).rejects.toMatchObject({
      statusCode: 401,
      code: "REFRESH_TOKEN_REUSED",
    });
  });
});
