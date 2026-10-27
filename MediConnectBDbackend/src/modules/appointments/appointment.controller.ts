/**
 * Patient booking HTTP handlers: derive the patient profile from authentication, validate opaque
 * IDs, and delegate to services. Never accept patient ownership fields from the request body.
 */

import type { RequestHandler as HttpHandler } from "express";
import { type RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import { type AuthenticatedLocals } from "../auth/auth.middleware";
import { appointmentIdSchema, bookAppointmentSchema, cancelAppointmentSchema, createHoldSchema, holdIdSchema, rescheduleAppointmentSchema } from "./appointment.schema";
import type { AppointmentService } from "./appointment.service";
/**
 * HTTP handlers: validate input, call services, and format responses.
 */
export function createAppointmentController(options: {
    appointmentService: AppointmentService;
    authenticate: RequestHandler;
}) {
    return {
        holdSlot: async (request, response) => {
            const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
            const input = createHoldSchema.parse(request.body);
            response
                .status(201)
                .json(await options.appointmentService.holdSlot(patientProfileId, input.slotId));
        },
        releaseHold: async (request, response) => {
            const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
            const holdId = holdIdSchema.parse(request.params.holdId);
            await options.appointmentService.releaseHold(patientProfileId, holdId);
            response.status(204).send();
        },
        bookAppointment: async (request, response) => {
            const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
            const input = bookAppointmentSchema.parse(request.body);
            response
                .status(201)
                .json(
                    await options.appointmentService.bookAppointment(
                        patientProfileId,
                        input.holdId,
                        input.familyMemberId ?? null,
                    ),
                );
        },
        rescheduleAppointment: async (request, response) => {
            const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
            const appointmentId = appointmentIdSchema.parse(request.params.appointmentId);
            const input = rescheduleAppointmentSchema.parse(request.body);
            response
                .status(200)
                .json(
                    await options.appointmentService.rescheduleAppointment(
                        patientProfileId,
                        appointmentId,
                        input.newSlotId,
                    ),
                );
        },
        listMyAppointments: async (_request, response) => {
            const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
            response.status(200).json({
                items: await options.appointmentService.listMyAppointments(patientProfileId),
            });
        },
        cancelAppointment: async (request, response) => {
            const locals = response.locals as AuthenticatedLocals;
            const appointmentId = appointmentIdSchema.parse(request.params.appointmentId);
            const input = cancelAppointmentSchema.parse(request.body);
            const roles = locals.authUser.roles;
            if (roles.includes("ADMIN")) {
                response.status(200).json(
                    await options.appointmentService.cancelAppointment(
                        "ADMIN",
                        locals.authUser.id,
                        appointmentId,
                        input.reason,
                    ),
                );
                return;
            }
            if (roles.includes("DOCTOR")) {
                const doctorProfileId = getDoctorProfileId(locals);
                response.status(200).json(
                    await options.appointmentService.cancelAppointment(
                        "DOCTOR",
                        doctorProfileId,
                        appointmentId,
                        input.reason,
                    ),
                );
                return;
            }
            const patientProfileId = getPatientProfileId(locals);
            response.status(200).json(
                await options.appointmentService.cancelAppointment(
                    "PATIENT",
                    patientProfileId,
                    appointmentId,
                    input.reason,
                ),
            );
        },
        completeAppointment: async (request, response) => {
            const doctorProfileId = getDoctorProfileId(response.locals as AuthenticatedLocals);
            const appointmentId = appointmentIdSchema.parse(request.params.appointmentId);
            response.status(200).json(
                await options.appointmentService.completeAppointment(doctorProfileId, appointmentId),
            );
        },
        markNoShow: async (request, response) => {
            const doctorProfileId = getDoctorProfileId(response.locals as AuthenticatedLocals);
            const appointmentId = appointmentIdSchema.parse(request.params.appointmentId);
            response.status(200).json(
                await options.appointmentService.markNoShow(doctorProfileId, appointmentId),
            );
        },
        getVideoSession: async (request, response) => {
            const locals = response.locals as AuthenticatedLocals;
            const appointmentId = appointmentIdSchema.parse(request.params.appointmentId);
            response.status(200).json(
                await options.appointmentService.getVideoSession(appointmentId, {
                    patientProfileId: locals.authUser.patientProfileId ?? null,
                    doctorProfileId: locals.authUser.doctorProfile?.id ?? null,
                }),
            );
        },
    } satisfies Record<string, HttpHandler>;
}
function getPatientProfileId(locals: AuthenticatedLocals): string {
    const patientProfileId = locals.authUser.patientProfileId;
    if (!patientProfileId) {
        throw new AppError(403, "PATIENT_PROFILE_REQUIRED", "A patient profile is required");
    }
    return patientProfileId;
}
function getDoctorProfileId(locals: AuthenticatedLocals): string {
    const doctorProfileId = locals.authUser.doctorProfile?.id;
    if (!doctorProfileId) {
        throw new AppError(403, "DOCTOR_PROFILE_REQUIRED", "A doctor profile is required");
    }
    return doctorProfileId;
}
