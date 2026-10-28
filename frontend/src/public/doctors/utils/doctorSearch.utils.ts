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

export interface DoctorSearchFilterValues {
  search?: string;
  specialty?: string;
  hospital?: string;
  area?: string;
  minFee?: string | number;
  maxFee?: string | number;
}

/**
 * Builds URL query parameters containing only non-empty, validated filters.
 */
export function buildDoctorSearchParams(
  filters: DoctorSearchFilterValues,
  limit = 12,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search && filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.specialty && filters.specialty.trim()) {
    params.set("specialty", filters.specialty.trim());
  }
  if (filters.hospital && filters.hospital.trim()) {
    params.set("hospital", filters.hospital.trim());
  }
  if (filters.area && filters.area.trim()) {
    params.set("area", filters.area.trim());
  }
  if (
    filters.minFee !== undefined &&
    String(filters.minFee).trim() !== "" &&
    !Number.isNaN(Number(filters.minFee))
  ) {
    params.set("minFee", String(Math.max(0, Number(filters.minFee))));
  }
  if (
    filters.maxFee !== undefined &&
    String(filters.maxFee).trim() !== "" &&
    !Number.isNaN(Number(filters.maxFee))
  ) {
    params.set("maxFee", String(Math.max(0, Number(filters.maxFee))));
  }
  params.set("limit", String(limit));
  return params;
}
