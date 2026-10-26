import { describe, expect, it } from "vitest";
import { ReviewService } from "../src/modules/reviews/review.service";
import type { ReviewRepository } from "../src/modules/reviews/review.repository";
import type { CreateReviewResult, DeleteReviewResult, ReviewView } from "../src/modules/reviews/review.types";
import { AppointmentStatus } from "../src/modules/appointments/appointment.entity";
import { randomUUID } from "crypto";

const patientId = randomUUID();
const doctorId = randomUUID();
const appointmentId = randomUUID();

function makeReview(id: string): ReviewView {
  return {
    id,
    appointmentId,
    patientProfileId: patientId,
    doctorProfileId: doctorId,
    rating: 5,
    comment: "Great!",
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class FakeReviewRepository implements ReviewRepository {
  createResult: CreateReviewResult = { kind: "CREATED", review: makeReview(randomUUID()) };
  deleteResult: DeleteReviewResult = { success: true };
  doctorReviews: ReviewView[] = [makeReview(randomUUID())];
  patientReviews: ReviewView[] = [makeReview(randomUUID())];

  async createReview(_input: Parameters<ReviewRepository["createReview"]>[0], _patientProfileId: string): Promise<CreateReviewResult> {
    return this.createResult;
  }

  async getDoctorReviews(_doctorProfileId: string): Promise<ReviewView[]> {
    return this.doctorReviews;
  }

  async getPatientReviews(_patientProfileId: string): Promise<ReviewView[]> {
    return this.patientReviews;
  }

  async deleteReview(_reviewId: string, _actorId: string): Promise<DeleteReviewResult> {
    return this.deleteResult;
  }
}

describe("ReviewService", () => {
  it("creates a review successfully", async () => {
    const repo = new FakeReviewRepository();
    const service = new ReviewService(repo);
    const result = await service.createReview(patientId, {
      appointmentId,
      rating: 5,
      comment: "Excellent!",
    });
    expect(result.kind).toBe("CREATED");
    if (result.kind === "CREATED") expect(result.review.rating).toBe(5);
  });

  it("rejects invalid rating below 1", async () => {
    const repo = new FakeReviewRepository();
    const service = new ReviewService(repo);
    await expect(
      service.createReview(patientId, { appointmentId, rating: 0 }),
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_RATING" });
  });

  it("rejects invalid rating above 5", async () => {
    const repo = new FakeReviewRepository();
    const service = new ReviewService(repo);
    await expect(
      service.createReview(patientId, { appointmentId, rating: 6 }),
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_RATING" });
  });

  it("returns APPOINTMENT_NOT_FOUND error", async () => {
    const repo = new FakeReviewRepository();
    repo.createResult = { kind: "APPOINTMENT_NOT_FOUND" };
    const service = new ReviewService(repo);
    await expect(
      service.createReview(patientId, { appointmentId, rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 404, code: "APPOINTMENT_NOT_FOUND" });
  });

  it("returns ALREADY_REVIEWED error", async () => {
    const repo = new FakeReviewRepository();
    repo.createResult = { kind: "ALREADY_REVIEWED" };
    const service = new ReviewService(repo);
    await expect(
      service.createReview(patientId, { appointmentId, rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 409, code: "ALREADY_REVIEWED" });
  });

  it("lists doctor reviews", async () => {
    const repo = new FakeReviewRepository();
    const service = new ReviewService(repo);
    const reviews = await service.getDoctorReviews(doctorId);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.rating).toBe(5);
  });

  it("lists patient reviews", async () => {
    const repo = new FakeReviewRepository();
    const service = new ReviewService(repo);
    const reviews = await service.getPatientReviews(patientId);
    expect(reviews).toHaveLength(1);
  });

  it("deletes a review successfully", async () => {
    const repo = new FakeReviewRepository();
    const service = new ReviewService(repo);
    const result = await service.deleteReview(randomUUID());
    expect(result.success).toBe(true);
  });

  it("throws REVIEW_NOT_FOUND on failed delete", async () => {
    const repo = new FakeReviewRepository();
    repo.deleteResult = { success: false };
    const service = new ReviewService(repo);
    await expect(service.deleteReview(randomUUID())).rejects.toMatchObject({
      statusCode: 404,
      code: "REVIEW_NOT_FOUND",
    });
  });
});
