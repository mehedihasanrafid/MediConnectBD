import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ConsultationMode } from "../src/database/entities/consultation-mode";
import { generateSlots } from "../src/modules/scheduling/slot-generator";
import type {
  ScheduleRuleView,
  TimeOffView,
} from "../src/modules/scheduling/scheduling.types";

const doctorId = randomUUID();
const rule: ScheduleRuleView = {
  id: randomUUID(),
  doctorProfileId: doctorId,
  dayOfWeek: 0,
  startTime: "09:00:00",
  endTime: "10:00:00",
  slotDurationMinutes: 20,
  mode: ConsultationMode.VIDEO,
  chamberId: null,
  isActive: true,
};

function timeOff(input: Partial<TimeOffView> = {}): TimeOffView {
  return {
    id: randomUUID(),
    doctorProfileId: doctorId,
    date: "2026-10-18",
    startTime: null,
    endTime: null,
    reason: null,
    createdAt: new Date("2026-10-17T00:00:00Z"),
    ...input,
  };
}

function generate(blocks: TimeOffView[] = []) {
  return generateSlots({
    doctorProfileId: doctorId,
    rules: [rule],
    timeOff: blocks,
    videoConsultationFee: 800,
    chambers: [],
    startDate: "2026-10-18",
    days: 1,
    now: new Date("2026-10-17T00:00:00Z"),
  });
}

describe("generateSlots", () => {
  it("creates fixed-duration slots in Asia/Dhaka and stores UTC instants", () => {
    const slots = generate();

    expect(slots).toHaveLength(3);
    expect(slots[0]?.startAt.toISOString()).toBe("2026-10-18T03:00:00.000Z");
    expect(slots[0]?.endAt.toISOString()).toBe("2026-10-18T03:20:00.000Z");
    expect(slots[0]?.feeAmount).toBe(800);
  });

  it("removes every slot that overlaps partial time off", () => {
    const slots = generate([
      timeOff({ startTime: "09:20:00", endTime: "09:40:00" }),
    ]);

    expect(slots.map((slot) => slot.startAt.toISOString())).toEqual([
      "2026-10-18T03:00:00.000Z",
      "2026-10-18T03:40:00.000Z",
    ]);
  });

  it("removes all slots on full-day time off", () => {
    expect(generate([timeOff()])).toEqual([]);
  });
});
