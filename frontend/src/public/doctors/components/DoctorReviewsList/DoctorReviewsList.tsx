import { Badge, Button, Card, EmptyState } from "../../../../components/ui";
import type { Review } from "../../../../shared/types";
import { formatDhakaDate } from "../../../../shared/utils/format";
import { renderStars } from "../../utils/doctorSearch.utils";
import styles from "./DoctorReviewsList.module.css";

interface DoctorReviewsListProps {
  reviews: Review[];
  canModerate: boolean;
  onRemoveReview: (reviewId: string) => Promise<void>;
}

/**
 * Lists verified patient reviews for a doctor, with optional admin moderation.
 */
export function DoctorReviewsList({
  reviews,
  canModerate,
  onRemoveReview,
}: DoctorReviewsListProps) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Patient reviews ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <EmptyState>No reviews yet for this doctor.</EmptyState>
      ) : (
        reviews.map((rev) => (
          <Card key={rev.id} className={styles.reviewCard}>
            <div className={`row space-between ${styles.reviewHeader}`}>
              <Badge tone="success">
                {renderStars(rev.rating)} ({rev.rating}/5)
              </Badge>
              <div className={`row ${styles.reviewMeta}`}>
                <span className="muted small">{formatDhakaDate(rev.createdAt)}</span>
                {canModerate && (
                  <Button variant="danger" onClick={() => void onRemoveReview(rev.id)}>
                    Hide review
                  </Button>
                )}
              </div>
            </div>
            {rev.comment && <p className={styles.comment}>{rev.comment}</p>}
          </Card>
        ))
      )}
    </>
  );
}
