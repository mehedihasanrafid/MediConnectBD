import type { AvailabilitySlot, Review } from "../../../shared/types";

/**
 * Calculates average rating from a list of doctor reviews.
 */
export function calculateAverageRating(reviews: Review[]): string | null {
  if (!reviews || reviews.length === 0) return null;
  const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
  return (sum / reviews.length).toFixed(1);
}

/**
 * Formats a 1-5 rating into stars.
 */
export function renderStars(rating: number): string {
  const bounded = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(bounded) + "☆".repeat(5 - bounded);
}

/**
 * Groups available consultation slots by calendar date (YYYY-MM-DD).
 */
export function groupSlotsByDate(slots: AvailabilitySlot[]): Map<string, AvailabilitySlot[]> {
  const grouped = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots) {
    const day = slot.startAt.slice(0, 10);
    const existing = grouped.get(day) ?? [];
    existing.push(slot);
    grouped.set(day, existing);
  }
  return grouped;
}
