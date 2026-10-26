/**
 * Review routes — patient can create/list their own reviews, anyone can view doctor reviews,
 * admin can delete reviews.
 */

import { createReviewController } from "./review.controller";
import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import type { ReviewService } from "./review.service";

export function createReviewRouter(options: {
  reviewService: ReviewService;
  authenticate: RequestHandler;
}): Router {
  const controller = createReviewController(options);
  const router = Router();

  // Patient routes (authenticated)
  router.use(options.authenticate, requireRole("PATIENT"));
  router.post("/me/reviews", controller.createReview.bind(controller));
  router.get("/me/reviews", controller.listMyReviews.bind(controller));

  // Public route — anyone can view doctor reviews
  router.get("/doctors/:doctorId/reviews", controller.listDoctorReviews.bind(controller));

  // Admin route — delete reviews
  router.delete("/:reviewId", options.authenticate, requireRole("ADMIN"), controller.deleteReview.bind(controller));

  return router;
}
