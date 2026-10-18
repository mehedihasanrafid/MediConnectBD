import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../../common/errors/app-error";
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
