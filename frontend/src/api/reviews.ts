/**
 * Reviews domain API functions (patient creation/history, doctor public reviews, admin moderation).
 */

import type { Review } from "../shared/types";
import { api } from "./client";

export interface CreateReviewInput {
  appointmentId: string;
  rating: number;
  comment?: string | null;
}

export const reviewsApi = {
  create: (input: CreateReviewInput) => api.post<Review>("/reviews/me/reviews", input),
  listMyReviews: () => api.get<{ items: Review[] }>("/reviews/me/reviews"),
  listDoctorReviews: (doctorId: string) =>
    api.get<{ items: Review[] }>(`/reviews/doctors/${doctorId}/reviews`),
  removeAsAdmin: (reviewId: string) => api.delete<void>(`/reviews/${reviewId}`),
};
