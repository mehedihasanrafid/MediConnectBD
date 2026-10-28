/**
 * Patient review submission and display panel for COMPLETED appointments.
 * Enforces the 1-5 star rating contract and one-review-per-appointment rule.
 */

import { useState } from "react";

import { reviewsApi } from "../../../../api/reviews";
import { Alert, Badge, Button, Cluster, Field, FormField, Select, Text } from "../../../../shared/ui";
import { renderStars } from "../../../../public/doctors/utils/doctorSearch.utils";
import type { Review } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import styles from "./ReviewFormPanel.module.css";

export function ReviewFormPanel({
  appointmentId,
  existingReview,
  onReviewCreated,
}: {
  appointmentId: string;
  existingReview?: Review;
  onReviewCreated: (review: Review) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingReview) {
    return (
      <div className={styles.reviewRow}>
        <Badge tone="success">
          {renderStars(existingReview.rating)} ({existingReview.rating}/5)
        </Badge>
        {existingReview.comment && (
          <Text tone="muted" size="sm">“{existingReview.comment}”</Text>
        )}
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await reviewsApi.create({
        appointmentId,
        rating: Number(rating),
        comment: comment.trim() || null,
      });
      setOpen(false);
      onReviewCreated(created);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not submit your review."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <Cluster justify="between">
        <strong>Review this visit</strong>
        <Button variant="secondary" onClick={() => setOpen(!open)}>
          {open ? "Cancel" : "Leave a review"}
        </Button>
      </Cluster>

      {error && <Alert kind="error">{error}</Alert>}

      {open && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField label="Rating (1 to 5)">
            <Select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="5">★★★★★ (5 - Excellent)</option>
              <option value="4">★★★★☆ (4 - Good)</option>
              <option value="3">★★★☆☆ (3 - Average)</option>
              <option value="2">★★☆☆☆ (2 - Poor)</option>
              <option value="1">★☆☆☆☆ (1 - Very poor)</option>
            </Select>
          </FormField>
          <Field
            label="Feedback & comments"
            value={comment}
            onChange={setComment}
            placeholder="Share your consultation experience…"
          />
          <div>
            <Button type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Post review"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
