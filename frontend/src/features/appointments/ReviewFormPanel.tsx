/**
 * Patient review submission and display panel for COMPLETED appointments.
 * Enforces the 1-5 star rating contract and one-review-per-appointment rule.
 */

import { useState } from "react";
import { reviewsApi } from "../../api/reviews";
import { Alert, Badge, Button, Field } from "../../components/ui";
import type { Review } from "../../shared/types";
import { getErrorMessage } from "../../shared/utils/apiError";

function renderStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

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
      <div className="row" style={{ marginTop: "0.5rem" }}>
        <Badge tone="success">{renderStars(existingReview.rating)} ({existingReview.rating}/5)</Badge>
        {existingReview.comment && (
          <span className="muted small">“{existingReview.comment}”</span>
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
    <div style={{ marginTop: "0.5rem" }}>
      {error && <Alert kind="error">{error}</Alert>}
      {open ? (
        <form onSubmit={handleSubmit} className="filters">
          <label className="field" style={{ maxWidth: "160px" }}>
            <span>Rating</span>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="5">★★★★★ (5 - Excellent)</option>
              <option value="4">★★★★☆ (4 - Good)</option>
              <option value="3">★★★☆☆ (3 - Average)</option>
              <option value="2">★★☆☆☆ (2 - Fair)</option>
              <option value="1">★☆☆☆☆ (1 - Poor)</option>
            </select>
          </label>
          <Field
            label="Comment (optional)"
            value={comment}
            onChange={setComment}
            placeholder="Share your consultation experience"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit review"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <div className="row">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Leave a review
          </Button>
        </div>
      )}
    </div>
  );
}
