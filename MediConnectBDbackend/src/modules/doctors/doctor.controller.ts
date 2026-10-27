/**
 * Handles public directory/profile reads, doctor self-service, and admin application review.
 * Self-service derives the user from authentication; admin reviewers are also recorded from
 * verified context, never request-body IDs.
 */

import type { RequestHandler as HttpHandler } from "express";
import { type RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import type { AuthenticatedLocals } from "../auth/auth.middleware";
import type { DoctorService } from "./doctor.service";
import type { SchedulingService } from "../scheduling/scheduling.service";
import type { AppointmentService } from "../appointments/appointment.service";
import { doctorApplicationQuerySchema, doctorIdSchema, doctorReviewSchema, publicDoctorQuerySchema, updateDoctorProfileSchema } from "./doctor.schema";
interface ProtectedRouterOptions {
    doctorService: DoctorService;
    schedulingService: SchedulingService;
    appointmentService?: AppointmentService;
    authenticate: RequestHandler;
}
/**
 * HTTP handlers: validate input, call services, and format responses.
 */
export function createDoctorController(options: ProtectedRouterOptions) {
    return {
listPublic: async (request, response) => {
            const query = publicDoctorQuerySchema.parse(request.query);
            response.status(200).json(await options.doctorService.listPublic(query));
        },
getMyProfile: async (_request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            response.status(200).json(await options.doctorService.getMyProfile(user.id));
        },
getMyEarnings: async (_request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            response.status(200).json(await options.doctorService.getMyEarnings(user.id));
        },
getPatientHistory: async (request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            const patientProfileId = doctorIdSchema.parse(request.params.patientProfileId);
            response.status(200).json(
                await options.doctorService.getPatientHistory(user.id, patientProfileId),
            );
        },
updateMyProfile: async (request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            const input = updateDoctorProfileSchema.parse(request.body);
            response.status(200).json(await options.doctorService.updateMyProfile(user.id, input));
        },
submitApplication: async (_request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            response.status(200).json(await options.doctorService.submitMyApplication(user.id));
        },
listMyAppointments: async (_request, response) => {
            const doctorProfileId = (response.locals as AuthenticatedLocals).authUser.doctorProfile?.id;
            if (!doctorProfileId) {
                throw new AppError(403, "DOCTOR_PROFILE_REQUIRED", "A doctor profile is required");
            }
            const items = options.appointmentService
                ? await options.appointmentService.listDoctorAppointments(doctorProfileId)
                : [];
            response.status(200).json({ items });
        },
getPublicProfile: async (request, response) => {
            const doctorId = doctorIdSchema.parse(request.params.doctorId);
            response.status(200).json(await options.doctorService.getPublicProfile(doctorId));
        }
} satisfies Record<string, HttpHandler>;
}
/**
 * HTTP handlers: validate input, call services, and format responses.
 */
export function createAdminDoctorController(options: ProtectedRouterOptions) {
    return {
        listApplications: async (request, response) => {
            const query = doctorApplicationQuerySchema.parse(request.query);
            response.status(200).json(await options.doctorService.listApplications(query));
        },
        reviewApplication: async (request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            const doctorId = doctorIdSchema.parse(request.params.doctorId);
            const input = doctorReviewSchema.parse(request.body);
            response
                .status(200)
                .json(await options.doctorService.reviewApplication(user.id, doctorId, input));
        },
    } satisfies Record<string, HttpHandler>;
}
/**
 * HTTP handlers: validate input, call services, and format responses.
 */
export function createCatalogController(doctorService: DoctorService) {
    return {
        listSpecialties: async (_request, response) => {
            response.status(200).json({ items: await doctorService.listSpecialties() });
        },
        listHospitals: async (_request, response) => {
            response.status(200).json({ items: await doctorService.listHospitals() });
        },
    } satisfies Record<string, HttpHandler>;
}
