/**
 * Separates authenticated patient payment operations from provider form callbacks. Provider
 * notifications cannot rely on patient cookies; verification is mandatory regardless of
 * success/fail/cancel route name.
 */

import { createPaymentController } from './payment.controller';
import { Router, urlencoded, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import type { PaymentService } from "./payment.service";
export function createPaymentRouter(service: PaymentService, authenticate: RequestHandler): Router {
    const controller = createPaymentController(service);
    const router = Router();
    router.post("/appointments/:appointmentId/payments", authenticate, requireRole("PATIENT"), controller.initiate);
    router.get("/payments/:paymentId", authenticate, requireRole("PATIENT"), controller.getStatus);
    router.post("/payments/:paymentId/reconcile", authenticate, requireRole("PATIENT"), controller.reconcile);
    // Provider callbacks cannot use patient cookies. All state comes from server verification.
    for (const kind of ["ipn", "success", "fail", "cancel"] as const) {
        router.post(`/payments/sslcommerz/${kind}`, urlencoded({ extended: false, limit: "32kb", parameterLimit: 100 }), controller.callback);
    }
    return router;
}
