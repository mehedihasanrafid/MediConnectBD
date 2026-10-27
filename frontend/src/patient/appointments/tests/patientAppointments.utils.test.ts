import { describe, expect, it } from "vitest";

import type { Appointment } from "../../../shared/types";
import {
  appointmentStatusTone,
  isAppointmentCancellable,
  partitionAppointments,
} from "../utils/patientAppointments.utils";

describe("patientAppointments.utils", () => {
  it("returns correct status tones", () => {
    expect(appointmentStatusTone("CONFIRMED")).toBe("success");
    expect(appointmentStatusTone("COMPLETED")).toBe("success");
    expect(appointmentStatusTone("PENDING_PAYMENT")).toBe("warning");
    expect(appointmentStatusTone("CANCELLED")).toBe("danger");
    expect(appointmentStatusTone("NO_SHOW")).toBe("danger");
    expect(appointmentStatusTone("UNKNOWN")).toBe("neutral");
  });

  it("identifies cancellable appointments", () => {
    const confirmedAppt = { status: "CONFIRMED" } as Appointment;
    const completedAppt = { status: "COMPLETED" } as Appointment;
    expect(isAppointmentCancellable(confirmedAppt)).toBe(true);
    expect(isAppointmentCancellable(completedAppt)).toBe(false);
  });

  it("partitions appointments into upcoming and past", () => {
    const list = [
      { id: "1", status: "CONFIRMED" },
      { id: "2", status: "PENDING_PAYMENT" },
      { id: "3", status: "COMPLETED" },
      { id: "4", status: "CANCELLED" },
    ] as Appointment[];

    const { upcoming, past } = partitionAppointments(list);
    expect(upcoming.length).toBe(2);
    expect(past.length).toBe(2);
    expect(upcoming.map((a) => a.id)).toEqual(["1", "2"]);
    expect(past.map((a) => a.id)).toEqual(["3", "4"]);
  });
});
