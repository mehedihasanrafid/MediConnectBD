/**
 * Review service — validates input, enforces business rules, and delegates to repository.
 */

import { AppError } from "../../utils/app-error";
import type { ReviewRepository } from "./review.repository";
import type { CreateReviewInput, CreateReviewResult, DeleteReviewResult } from "./review.types";

export class ReviewService {
  constructor(private readonly repository: ReviewRepository) {}

  async createReview(
    patientProfileId: string,
    input: CreateReviewInput,
  ): Promise<CreateReviewResult> {
    // Validate rating range
    if (input.rating < 1 || input.rating > 5) {
      throw new AppError(400, "INVALID_RATING", "Rating must be between 1 and 5");
    }

    const result = await this.repository.createReview(input, patientProfileId);

    if (result.kind === "APPOINTMENT_NOT_FOUND") {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
    }
    if (result.kind === "APPOINTMENT_NOT_COMPLETED") {
      throw new AppError(409, "APPOINTMENT_NOT_COMPLETED", "Only completed appointments can be reviewed");
    }
    if (result.kind === "ALREADY_REVIEWED") {
      throw new AppError(409, "ALREADY_REVIEWED", "You have already reviewed this appointment");
    }

    return result;
  }

  getDoctorReviews(doctorProfileId: string) {
    return this.repository.getDoctorReviews(doctorProfileId);
  }

  getPatientReviews(patientProfileId: string) {
    return this.repository.getPatientReviews(patientProfileId);
  }

  async deleteReview(reviewId: string): Promise<DeleteReviewResult> {
    const result = await this.repository.deleteReview(reviewId, "");
    if (!result.success) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review was not found");
    }
    return result;
  }
}
