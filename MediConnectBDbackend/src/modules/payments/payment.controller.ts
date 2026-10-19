/**
 * Reads patient checkout/status requests and provider callback references. Callback endpoints are
 * public but perform server verification through PaymentService; responses expose only the
 * deliberately selected payment fields.
 */

import type { RequestHandler as HttpHandler } from "express";
import { AppError } from "../../utils/app-error";
import { type AuthenticatedLocals } from "../auth/auth.middleware";
import { idempotencyKeySchema, paymentCallbackSchema, paymentCustomerSchema, paymentIdSchema } from "./payment.schema";
import type { PaymentService } from "./payment.service";
function patientId(locals: AuthenticatedLocals): string {
    if (!locals.authUser.patientProfileId)
        throw new AppError(403, "PATIENT_PROFILE_REQUIRED", "A patient profile is required");
    return locals.authUser.patientProfileId;
}
/**
 * HTTP handlers: validate input, call services, and format responses.
 */
export function createPaymentController(service: PaymentService) {
    return {
        initiate: async (request, response) => {
            const appointmentId = paymentIdSchema.parse(request.params.appointmentId);
            const key = idempotencyKeySchema.parse(request.header("idempotency-key"));
            const customer = paymentCustomerSchema.parse(request.body);
            response.status(200).json(await service.initiate(patientId(response.locals as AuthenticatedLocals), appointmentId, key, customer));
        },
        getStatus: async (request, response) => {
            response.json(await service.getOwned(paymentIdSchema.parse(request.params.paymentId), patientId(response.locals as AuthenticatedLocals)));
        },
        reconcile: async (request, response) => {
            response.json(await service.reconcile(paymentIdSchema.parse(request.params.paymentId), patientId(response.locals as AuthenticatedLocals)));
        },
        callback: async (request, response) => {
            const input = paymentCallbackSchema.parse(request.body);
            const payment = await service.callback(input.tran_id, input.val_id);
            response.json({ received: true, status: payment.status });
        },
    } satisfies Record<string, HttpHandler>;
}
