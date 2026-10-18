import { Router, type Request, type Response } from "express";
import type { CookieOptions } from "express";
import type { AuthService } from "./auth.service";
import {
  doctorRegistrationSchema,
  loginSchema,
  patientRegistrationSchema,
} from "./auth.schemas";
import type { AuthResult, SessionContext } from "./auth.types";

export const REFRESH_COOKIE_NAME = "mediconnect_refresh";

export interface AuthRouterOptions {
  authService: AuthService;
  secureCookies: boolean;
}

function sessionContext(request: Request): SessionContext {
  return {
    userAgent: request.get("user-agent")?.slice(0, 255) ?? null,
    ipAddress: request.ip?.slice(0, 45) ?? null,
  };
}

function refreshCookieOptions(secure: boolean, expires?: Date): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api/v1/auth",
  };
  if (expires) options.expires = expires;
  return options;
}

function sendAuthResult(
  response: Response,
  result: AuthResult,
  statusCode: number,
  secureCookies: boolean,
): void {
  response.cookie(
    REFRESH_COOKIE_NAME,
    result.refreshToken,
    refreshCookieOptions(secureCookies, result.refreshTokenExpiresAt),
  );
  response.status(statusCode).json({
    accessToken: result.accessToken,
    accessTokenExpiresIn: result.accessTokenExpiresIn,
    tokenType: "Bearer",
    user: result.user,
  });
}

export function createAuthRouter(options: AuthRouterOptions): Router {
  const router = Router();

  router.post("/patient/register", async (request, response) => {
    const input = patientRegistrationSchema.parse(request.body);
    const result = await options.authService.registerPatient(input, sessionContext(request));
    sendAuthResult(response, result, 201, options.secureCookies);
  });

  router.post("/doctor/register", async (request, response) => {
    const input = doctorRegistrationSchema.parse(request.body);
    const result = await options.authService.registerDoctor(input, sessionContext(request));
    sendAuthResult(response, result, 201, options.secureCookies);
  });

  router.post("/login", async (request, response) => {
    const input = loginSchema.parse(request.body);
    const result = await options.authService.login(input, sessionContext(request));
    sendAuthResult(response, result, 200, options.secureCookies);
  });

  router.post("/refresh", async (request, response) => {
    const result = await options.authService.refresh(
      request.cookies[REFRESH_COOKIE_NAME] as string | undefined,
      sessionContext(request),
    );
    sendAuthResult(response, result, 200, options.secureCookies);
  });

  router.post("/logout", async (request, response) => {
    await options.authService.logout(
      request.cookies[REFRESH_COOKIE_NAME] as string | undefined,
    );
    response.clearCookie(
      REFRESH_COOKIE_NAME,
      refreshCookieOptions(options.secureCookies),
    );
    response.status(204).send();
  });

  return router;
}
