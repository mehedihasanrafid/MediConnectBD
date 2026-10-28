import { Badge, Button, Card, Cluster, EmptyState, Text } from "../../../../shared/ui";
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
            <Cluster justify="between" className={styles.reviewHeader}>
              <Badge tone="success">
                {renderStars(rev.rating)} ({rev.rating}/5)
              </Badge>
              <Cluster gap={3} className={styles.reviewMeta}>
                <Text tone="muted" size="sm">
                  {formatDhakaDate(rev.createdAt)}
                </Text>
                {canModerate && (
                  <Button variant="danger" size="sm" onClick={() => void onRemoveReview(rev.id)}>
                    Hide review
                  </Button>
                )}
              </Cluster>
            </Cluster>
            {rev.comment && <p className={styles.comment}>{rev.comment}</p>}
          </Card>
        ))
      )}
    </>
  );
}
