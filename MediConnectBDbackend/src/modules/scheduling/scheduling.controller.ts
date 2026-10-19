/**
 * Translates doctor schedule/time-off requests into service calls using the authenticated user.
 * Public availability accepts a doctor UUID and a bounded date query; it does not require a
 * patient session.
 */

import type { RequestHandler } from "express";
import type { AuthenticatedLocals } from "../auth/auth.middleware";
import type { SchedulingService } from "./scheduling.service";
import { doctorIdSchema } from "../doctors/doctor.schema";
import { availabilityQuerySchema, createTimeOffSchema, replaceScheduleSchema, timeOffIdSchema } from "./scheduling.schema";
export interface SchedulingControllerOptions {
    schedulingService: SchedulingService;
}
/**
 * Scheduling transport logic stays separate from doctor-profile handlers.
 */
export function createSchedulingController(options: SchedulingControllerOptions) {
    return {
        getMySchedule: async (_request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            response.status(200).json(await options.schedulingService.getMySchedule(user.id));
        },
        replaceMySchedule: async (request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            const input = replaceScheduleSchema.parse(request.body);
            response
                .status(200)
                .json(await options.schedulingService.replaceMySchedule(user.id, input.rules));
        },
        addTimeOff: async (request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            const input = createTimeOffSchema.parse(request.body);
            response.status(201).json(await options.schedulingService.addMyTimeOff(user.id, input));
        },
        removeTimeOff: async (request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            const timeOffId = timeOffIdSchema.parse(request.params.timeOffId);
            await options.schedulingService.removeMyTimeOff(user.id, timeOffId);
            response.status(204).send();
        },
        generateSlots: async (_request, response) => {
            const user = (response.locals as AuthenticatedLocals).authUser;
            response.status(200).json(await options.schedulingService.regenerateMySlots(user.id));
        },
        getAvailability: async (request, response) => {
            const doctorId = doctorIdSchema.parse(request.params.doctorId);
            const query = availabilityQuerySchema.parse(request.query);
            response
                .status(200)
                .json(await options.schedulingService.getPublicAvailability(doctorId, query));
        }
    } satisfies Record<string, RequestHandler>;
}
