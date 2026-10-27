import { describe, expect, it } from "vitest";

import type { AvailabilitySlot, Review } from "../../../shared/types";
import {
  calculateAverageRating,
  groupSlotsByDate,
  renderStars,
} from "../utils/doctorSearch.utils";

describe("doctorSearch.utils", () => {
  it("calculates average rating properly", () => {
    expect(calculateAverageRating([])).toBeNull();

    const sampleReviews: Review[] = [
      {
        id: "1",
        appointmentId: "a1",
        patientProfileId: "p1",
        doctorProfileId: "d1",
        rating: 5,
        comment: "Great",
        isVisible: true,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        id: "2",
        appointmentId: "a2",
        patientProfileId: "p2",
        doctorProfileId: "d1",
        rating: 4,
        comment: "Good",
        isVisible: true,
        createdAt: "2026-01-02",
        updatedAt: "2026-01-02",
      },
    ];
    expect(calculateAverageRating(sampleReviews)).toBe("4.5");
  });

  it("renders 5-star ratings with fill and empty stars", () => {
    expect(renderStars(5)).toBe("★★★★★");
    expect(renderStars(3)).toBe("★★★☆☆");
    expect(renderStars(0)).toBe("☆☆☆☆☆");
  });

  it("groups availability slots by day", () => {
    const slots: AvailabilitySlot[] = [
      {
        id: "s1",
        doctorId: "d1",
        startAt: "2026-11-01T10:00:00.000Z",
        endAt: "2026-11-01T10:20:00.000Z",
        mode: "VIDEO",
        feeAmount: 500,
        chamber: null,
      },
      {
        id: "s2",
        doctorId: "d1",
        startAt: "2026-11-01T11:00:00.000Z",
        endAt: "2026-11-01T11:20:00.000Z",
        mode: "VIDEO",
        feeAmount: 500,
        chamber: null,
      },
      {
        id: "s3",
        doctorId: "d1",
        startAt: "2026-11-02T14:00:00.000Z",
        endAt: "2026-11-02T14:20:00.000Z",
        mode: "CHAMBER",
        feeAmount: 800,
        chamber: null,
      },
    ];

    const grouped = groupSlotsByDate(slots);
    expect(grouped.size).toBe(2);
    expect(grouped.get("2026-11-01")?.length).toBe(2);
    expect(grouped.get("2026-11-02")?.length).toBe(1);
  });
});
