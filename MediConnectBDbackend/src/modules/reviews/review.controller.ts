/**
 * Review HTTP handlers — validate input, enforce ownership, delegate to services.
 */

import type { RequestHandler as HttpHandler } from "express";
import { type RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import { type AuthenticatedLocals } from "../auth/auth.middleware";
import type { ReviewService } from "./review.service";
import { z } from "zod";

const createReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
}).strict();

export function createReviewController(options: {
  reviewService: ReviewService;
  authenticate: RequestHandler;
}) {
  return {
    createReview: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const input = createReviewSchema.parse(request.body);
      response.status(201).json(await options.reviewService.createReview(patientProfileId, input));
    },

    listMyReviews: async (_request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      response.status(200).json({
        items: await options.reviewService.getPatientReviews(patientProfileId),
      });
    },

    listDoctorReviews: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const doctorId = z.string().uuid().parse(request.params.doctorId);
      response.status(200).json({
        items: await options.reviewService.getDoctorReviews(doctorId),
      });
    },

    deleteReview: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const reviewId = z.string().uuid().parse(request.params.reviewId);
      await options.reviewService.deleteReview(reviewId);
      response.status(204).send();
    },
  };
}

function getPatientProfileId(locals: AuthenticatedLocals): string {
  const patientProfileId = locals.authUser.patientProfileId;
  if (!patientProfileId) {
    throw new AppError(403, "PATIENT_PROFILE_REQUIRED", "A patient profile is required");
  }
  return patientProfileId;
}
