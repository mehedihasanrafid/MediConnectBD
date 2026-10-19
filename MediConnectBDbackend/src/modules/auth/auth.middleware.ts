/**
 * Verifies bearer access tokens, reloads current user status/roles, and exposes authenticated
 * context through response.locals. Role checks are coarse gates; services/repositories still
 * enforce ownership of appointments and payments.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../../utils/app-error";
import type { AuthRepository } from "./auth.repository";
import type { AuthUser } from "./auth.types";
import type { AccessTokenService } from "./access-token.service";

export interface AuthenticatedLocals {
  authUser: AuthUser;
}

/**
 * Authenticates the JWT, then reloads account status and roles. Refresh-session revocation is not
 * queried here; account suspension takes effect immediately.
 */
export function createAuthenticate(
  accessTokens: AccessTokenService,
  repository: AuthRepository,
): RequestHandler {
  return async (request: Request, response: Response, next: NextFunction) => {
    const authorization = request.header("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
    }

    const token = authorization.slice("Bearer ".length).trim();
    const claims = accessTokens.verify(token);
    const user = await repository.findUserById(claims.sub);

    if (!user) {
      throw new AppError(401, "INVALID_ACCESS_TOKEN", "Authentication is required");
    }
    if (user.status === "SUSPENDED") {
      throw new AppError(403, "ACCOUNT_SUSPENDED", "This account has been suspended");
    }
    if (user.status !== "ACTIVE") {
      throw new AppError(403, "ACCOUNT_NOT_ACTIVE", "This account is not active");
    }

    (response.locals as AuthenticatedLocals).authUser = user;
    next();
  };
}

/**
 * Checks current role membership only. Passing this gate never substitutes for a feature's
 * record-ownership policy.
 */
export function requireRole(...allowedRoles: string[]): RequestHandler {
  return (_request: Request, response: Response, next: NextFunction) => {
    const user = (response.locals as Partial<AuthenticatedLocals>).authUser;
    if (!user) {
      throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
    }
    if (!allowedRoles.some((role) => user.roles.includes(role))) {
      throw new AppError(403, "ROLE_FORBIDDEN", "Your role cannot access this resource");
    }
    next();
  };
}
