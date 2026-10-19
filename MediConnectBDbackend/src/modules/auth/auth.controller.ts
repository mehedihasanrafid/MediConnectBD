/**
 * Authentication HTTP boundary: parses validated inputs, captures bounded session metadata, sets
 * the HTTP-only refresh cookie, and returns only the public token/user response. Cookie options
 * must match when setting and clearing it.
 */

import type { RequestHandler as HttpHandler } from "express";
import { type Request, type Response } from "express";
import type { CookieOptions } from "express";
import type { AuthService } from "./auth.service";
import { doctorRegistrationSchema, loginSchema, patientRegistrationSchema } from "./auth.schema";
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
/**
 * Keeps refresh cookies HTTP-only, same-site strict, and scoped to auth routes; the same
 * attributes are reused when clearing them.
 */
function refreshCookieOptions(secure: boolean, expires?: Date): CookieOptions {
    const options: CookieOptions = {
        httpOnly: true,
        secure,
        sameSite: "strict",
        path: "/api/v1/auth",
    };
    if (expires)
        options.expires = expires;
    return options;
}
function sendAuthResult(response: Response, result: AuthResult, statusCode: number, secureCookies: boolean): void {
    response.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions(secureCookies, result.refreshTokenExpiresAt));
    response.status(statusCode).json({
        accessToken: result.accessToken,
        accessTokenExpiresIn: result.accessTokenExpiresIn,
        tokenType: "Bearer",
        user: result.user,
    });
}
/**
 * HTTP handlers: validate input, call services, and format responses.
 */
export function createAuthController(options: AuthRouterOptions) {
    return {
        registerPatient: async (request, response) => {
            const input = patientRegistrationSchema.parse(request.body);
            const result = await options.authService.registerPatient(input, sessionContext(request));
            sendAuthResult(response, result, 201, options.secureCookies);
        },
        registerDoctor: async (request, response) => {
            const input = doctorRegistrationSchema.parse(request.body);
            const result = await options.authService.registerDoctor(input, sessionContext(request));
            sendAuthResult(response, result, 201, options.secureCookies);
        },
        login: async (request, response) => {
            const input = loginSchema.parse(request.body);
            const result = await options.authService.login(input, sessionContext(request));
            sendAuthResult(response, result, 200, options.secureCookies);
        },
        refresh: async (request, response) => {
            const result = await options.authService.refresh(request.cookies[REFRESH_COOKIE_NAME] as string | undefined, sessionContext(request));
            sendAuthResult(response, result, 200, options.secureCookies);
        },
        logout: async (request, response) => {
            await options.authService.logout(request.cookies[REFRESH_COOKIE_NAME] as string | undefined);
            response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(options.secureCookies));
            response.status(204).send();
        },
    } satisfies Record<string, HttpHandler>;
}
