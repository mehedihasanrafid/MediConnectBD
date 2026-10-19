/**
 * Public registration/session endpoint bindings. Controllers handle parsing and cookies; these
 * routes do not accept a client-selected role for registration.
 */

import { createAuthController } from './auth.controller';
import { Router } from "express";
import type { AuthService } from "./auth.service";
export { REFRESH_COOKIE_NAME } from './auth.controller';
export interface AuthRouterOptions {
    authService: AuthService;
    secureCookies: boolean;
}
export function createAuthRouter(options: AuthRouterOptions): Router {
    const controller = createAuthController(options);
    const router = Router();
    router.post("/patient/register", controller.registerPatient);
    router.post("/doctor/register", controller.registerDoctor);
    router.post("/login", controller.login);
    router.post("/refresh", controller.refresh);
    router.post("/logout", controller.logout);
    return router;
}
