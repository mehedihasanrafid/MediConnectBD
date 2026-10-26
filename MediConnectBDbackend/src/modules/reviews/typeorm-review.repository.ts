/**
 * TypeORM implementation of the review repository. Handles persistence, validation,
 * and ownership enforcement for patient reviews.
 */

import type { DataSource } from "typeorm";
import { Review } from "./review.entity";
import type { ReviewRepository } from "./review.repository";
import type {
  CreateReviewInput,
  CreateReviewResult,
  DeleteReviewResult,
  ReviewView,
} from "./review.types";
import { Appointment, AppointmentStatus } from "../appointments/appointment.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";

export class TypeOrmReviewRepository implements ReviewRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createReview(
    input: CreateReviewInput,
    patientProfileId: string,
  ): Promise<CreateReviewResult> {
    return this.dataSource.transaction(async (manager) => {
      const appointments = manager.getRepository(Appointment);
      const reviewRepo = manager.getRepository(Review);

      // Check if appointment exists and belongs to this patient
      const appointment = await appointments.findOne({
        where: { id: input.appointmentId, patientProfileId },
        relations: { doctor: true },
      });

      if (!appointment) {
        return { kind: "APPOINTMENT_NOT_FOUND" };
      }

      // Only completed appointments can be reviewed
      if (appointment.status !== AppointmentStatus.COMPLETED) {
        return { kind: "APPOINTMENT_NOT_COMPLETED" };
      }

      // Check if already reviewed
      const existing = await reviewRepo.findOne({
        where: { appointmentId: input.appointmentId },
      });

      if (existing) {
        return { kind: "ALREADY_REVIEWED" };
      }

      // Validate rating
      if (input.rating < 1 || input.rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      // Create the review
      const review = reviewRepo.create({
        appointmentId: input.appointmentId,
        patientProfileId,
        doctorProfileId: appointment.doctorProfileId,
        rating: input.rating,
        comment: input.comment ?? null,
        isVisible: true,
      });

      const saved = await reviewRepo.save(review);
      return { kind: "CREATED", review: this.toView(saved) };
    });
  }

  async getDoctorReviews(doctorProfileId: string): Promise<ReviewView[]> {
    const reviews = await this.dataSource
      .getRepository(Review)
      .find({
        where: { doctorProfileId, isVisible: true },
        order: { createdAt: "DESC" },
      });
    return reviews.map((r) => this.toView(r));
  }

  async getPatientReviews(patientProfileId: string): Promise<ReviewView[]> {
    const reviews = await this.dataSource
      .getRepository(Review)
      .find({
        where: { patientProfileId },
        order: { createdAt: "DESC" },
      });
    return reviews.map((r) => this.toView(r));
  }

  async deleteReview(
    reviewId: string,
    _actorId: string,
  ): Promise<DeleteReviewResult> {
    const result = await this.dataSource
      .getRepository(Review)
      .update({ id: reviewId }, { isVisible: false });
    return { success: result.affected !== 0 };
  }

  private toView(review: Review): ReviewView {
    return {
      id: review.id,
      appointmentId: review.appointmentId,
      patientProfileId: review.patientProfileId,
      doctorProfileId: review.doctorProfileId,
      rating: review.rating,
      comment: review.comment,
      isVisible: review.isVisible,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
