/**
 * Contract for review persistence operations. Result unions distinguish missing,
 * expired, conflicting, forbidden, and success outcomes so services can map them
 * without depending on MySQL errors.
 */

import type {
  CreateReviewInput,
  CreateReviewResult,
  DeleteReviewResult,
  ReviewView,
} from "./review.types";

export interface ReviewRepository {
  createReview(input: CreateReviewInput, patientProfileId: string): Promise<CreateReviewResult>;
  getDoctorReviews(doctorProfileId: string): Promise<ReviewView[]>;
  getPatientReviews(patientProfileId: string): Promise<ReviewView[]>;
  deleteReview(reviewId: string, actorId: string): Promise<DeleteReviewResult>;
}
