/**
 * Coordinates registration and sessions behind injected password/token/repository interfaces. Raw
 * refresh tokens are returned only for the controller cookie; persistence receives hashes. The
 * injected clock makes expiry boundaries testable.
 */

import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../../utils/app-error";
import type { AuthRepository } from "./auth.repository";
import { AccessTokenService } from "./access-token.service";
import type { PasswordHasher } from "./password-hasher";
import type {
  AuthResult,
  AuthUser,
  DoctorRegistration,
  LoginInput,
  PatientRegistration,
  PublicUser,
  SessionContext,
} from "./auth.types";

const INVALID_LOGIN_MESSAGE = "Email or password is incorrect";
// This is not an account credential. It keeps unknown-email and wrong-password work comparable.
const DUMMY_PASSWORD_HASH =
  "$2b$12$if3NrbvpOiMwI1IaBBk2C.kVtypnRzUMZLPOrnTxGJpTE/Zo3Hb4u";

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokenTtlDays: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Hashes the validated password, creates the patient identity/profile, then starts a
   * refresh/access session.
   */
  async registerPatient(
    input: PatientRegistration,
    context: SessionContext,
  ): Promise<AuthResult> {
    await this.assertEmailAvailable(input.email);
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.createPatient(input, passwordHash);
    return this.createAuthenticatedSession(user, context);
  }

  /**
   * Creates an active login with a DRAFT professional profile; registration does not grant
   * clinical approval.
   */
  async registerDoctor(
    input: DoctorRegistration,
    context: SessionContext,
  ): Promise<AuthResult> {
    await this.assertEmailAvailable(input.email);
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.createDoctor(input, passwordHash);
    return this.createAuthenticatedSession(user, context);
  }

  /**
   * Uses the same public credential error for unknown emails and incorrect passwords, then checks
   * current account status.
   */
  async login(input: LoginInput, context: SessionContext): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(input.email);
    const passwordMatches = await this.passwordHasher.verify(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) {
      throw new AppError(401, "INVALID_CREDENTIALS", INVALID_LOGIN_MESSAGE);
    }

    this.assertAccountUsable(user);
    return this.createAuthenticatedSession(user, context);
  }

  /**
   * Replaces a single-use refresh token under the repository lock. A reuse result rejects the
   * session; access JWTs still follow their own expiry/status checks.
   */
  async refresh(rawToken: string | undefined, context: SessionContext): Promise<AuthResult> {
    if (!rawToken) {
      throw new AppError(401, "REFRESH_TOKEN_REQUIRED", "Refresh token is required");
    }

    const now = this.now();
    const replacementRawToken = this.generateRefreshToken();
    const replacementExpiresAt = this.refreshExpiry(now);
    const result = await this.repository.rotateRefreshSession(
      this.hashRefreshToken(rawToken),
      {
        tokenHash: this.hashRefreshToken(replacementRawToken),
        expiresAt: replacementExpiresAt,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      },
      now,
    );

    if (result.kind !== "ROTATED") {
      const code = result.kind === "REUSED" ? "REFRESH_TOKEN_REUSED" : "INVALID_REFRESH_TOKEN";
      throw new AppError(401, code, "The refresh session is no longer valid");
    }

    return {
      accessToken: this.accessTokens.issue(result.user, result.sessionId),
      accessTokenExpiresIn: this.accessTokens.expiresInSeconds,
      refreshToken: replacementRawToken,
      refreshTokenExpiresAt: replacementExpiresAt,
      user: this.toPublicUser(result.user),
    };
  }

  /**
   * Revokes the presented refresh token. Already-issued access JWTs are not individually revoked
   * by this operation.
   */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.repository.revokeRefreshSession(this.hashRefreshToken(rawToken), this.now());
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    if (await this.repository.findUserByEmail(email)) {
      throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account already uses this email");
    }
  }

  private assertAccountUsable(user: AuthUser): void {
    if (user.status === "SUSPENDED") {
      throw new AppError(403, "ACCOUNT_SUSPENDED", "This account has been suspended");
    }
    if (user.status !== "ACTIVE") {
      throw new AppError(403, "ACCOUNT_NOT_ACTIVE", "This account is not active");
    }
  }

  /**
   * Persists only the token hash and returns the raw token for the HTTP-only cookie response.
   */
  private async createAuthenticatedSession(
    user: AuthUser,
    context: SessionContext,
  ): Promise<AuthResult> {
    this.assertAccountUsable(user);
    const now = this.now();
    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiresAt = this.refreshExpiry(now);
    const sessionId = await this.repository.createRefreshSession({
      userId: user.id,
      tokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    return {
      accessToken: this.accessTokens.issue(user, sessionId),
      accessTokenExpiresIn: this.accessTokens.expiresInSeconds,
      refreshToken,
      refreshTokenExpiresAt,
      user: this.toPublicUser(user),
    };
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString("base64url");
  }

  private hashRefreshToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private refreshExpiry(now: Date): Date {
    return new Date(now.getTime() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  }

  /**
   * Explicit allowlist: never copy the internal password hash into the response.
   */
  private toPublicUser(user: AuthUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.roles,
      patientProfileId: user.patientProfileId,
      doctorProfile: user.doctorProfile,
    };
  }
}
