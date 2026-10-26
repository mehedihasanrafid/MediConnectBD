/**
 * Types for the review system.
 */

export interface ReviewView {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  doctorProfileId: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewInput {
  appointmentId: string;
  rating: number; // 1-5
  comment?: string | null | undefined;
}

export type CreateReviewResult =
  | { kind: "CREATED"; review: ReviewView }
  | { kind: "APPOINTMENT_NOT_FOUND" }
  | { kind: "APPOINTMENT_NOT_COMPLETED" }
  | { kind: "ALREADY_REVIEWED" }
  | { kind: "PATIENT_FORBIDDEN" };

export interface DeleteReviewResult {
  success: boolean;
}
