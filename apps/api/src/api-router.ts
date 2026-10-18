import { Router } from "express";
import {
  createAuthenticate,
  type AuthenticatedLocals,
} from "./common/middleware/authenticate";
import type { AuthRepository } from "./modules/auth/auth.repository";
import { createAuthRouter } from "./modules/auth/auth.routes";
import type { AuthService } from "./modules/auth/auth.service";
import type { AccessTokenService } from "./modules/auth/access-token.service";

export interface ApiRouterOptions {
  authService: AuthService;
  authRepository: AuthRepository;
  accessTokens: AccessTokenService;
  secureCookies: boolean;
}

export function createApiRouter(options: ApiRouterOptions): Router {
  const router = Router();
  const authenticate = createAuthenticate(options.accessTokens, options.authRepository);

  router.use(
    "/auth",
    createAuthRouter({
      authService: options.authService,
      secureCookies: options.secureCookies,
    }),
  );

  router.get("/me", authenticate, (_request, response) => {
    const user = (response.locals as AuthenticatedLocals).authUser;
    response.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.roles,
      patientProfileId: user.patientProfileId,
      doctorProfile: user.doctorProfile,
    });
  });

  return router;
}
