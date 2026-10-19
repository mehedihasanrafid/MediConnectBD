/**
 * Issues short-lived access JWTs and validates algorithm, issuer, audience, expiry, and claim
 * shape. sessionId identifies the originating refresh session; verification here does not query
 * its current revocation state.
 */

import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../../utils/app-error";
import type { AuthUser } from "./auth.types";

const claimsSchema = z.object({
  sub: z.string().uuid(),
  sessionId: z.string().uuid(),
  roles: z.array(z.string().min(1)),
  type: z.literal("access"),
});

export type AccessClaims = z.infer<typeof claimsSchema>;

export class AccessTokenService {
  constructor(
    private readonly secret: string,
    public readonly expiresInSeconds: number,
  ) {}

  /**
   * Signs bounded access claims with a fixed issuer/audience; the token contains no password or
   * clinical profile.
   */
  issue(user: AuthUser, sessionId: string): string {
    return jwt.sign(
      {
        roles: user.roles,
        sessionId,
        type: "access",
      },
      this.secret,
      {
        algorithm: "HS256",
        subject: user.id,
        issuer: "mediconnect-api",
        audience: "mediconnect-web",
        expiresIn: this.expiresInSeconds,
        jwtid: randomUUID(),
      },
    );
  }

  /**
   * Checks cryptographic validity and expected claim shape; database account/role freshness is
   * checked by auth middleware.
   */
  verify(token: string): AccessClaims {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ["HS256"],
        issuer: "mediconnect-api",
        audience: "mediconnect-web",
      });
      return claimsSchema.parse(decoded);
    } catch {
      throw new AppError(401, "INVALID_ACCESS_TOKEN", "Authentication is required");
    }
  }
}
