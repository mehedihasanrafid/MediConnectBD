import { describe, expect, it } from "vitest";

import {
  applicationStatusTone,
  DAY_NAMES,
  mapRuleToPayload,
  parseCommaSeparatedLanguages,
} from "../utils/doctorDashboard.utils";

describe("doctorDashboard.utils", () => {
  it("maps application status to semantic badge tones", () => {
    expect(applicationStatusTone("APPROVED")).toBe("success");
    expect(applicationStatusTone("PENDING_REVIEW")).toBe("warning");
    expect(applicationStatusTone("REJECTED")).toBe("danger");
    expect(applicationStatusTone("DRAFT")).toBe("neutral");
  });

  it("parses comma-separated languages and falls back to Bangla", () => {
    expect(parseCommaSeparatedLanguages("Bangla, English , Hindi")).toEqual([
      "Bangla",
      "English",
      "Hindi",
    ]);
    expect(parseCommaSeparatedLanguages("   ")).toEqual(["Bangla"]);
  });

  it("normalizes schedule rule times to HH:MM payloads", () => {
    expect(DAY_NAMES[0]).toBe("Sunday");
    expect(
      mapRuleToPayload({
        id: "r1",
        dayOfWeek: 1,
        startTime: "18:00:00",
        endTime: "20:00:00",
        slotDurationMinutes: 20,
        mode: "VIDEO",
        isActive: true,
      }),
    ).toEqual({
      dayOfWeek: 1,
      startTime: "18:00",
      endTime: "20:00",
      slotDurationMinutes: 20,
      mode: "VIDEO",
    });
  });
});
