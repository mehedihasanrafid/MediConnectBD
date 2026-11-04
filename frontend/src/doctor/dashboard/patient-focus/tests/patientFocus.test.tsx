import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { legacyDashboardPath, patientIdentity, todaysPatients, videoEntry } from "../patientFocus.model";
import { FocusedPatientCard } from "../FocusedPatientCard";
import { PatientRecordsPanel } from "../PatientRecordsPanel";
import { PatientQueue } from "../PatientQueue";
import { appointment } from "./patientFocus.fixture";

const now = new Date("2026-11-04T10:00:00Z");
describe("Patient-focused dashboard policies", () => {
  it("uses Dhaka day boundaries, sorts the queue and excludes closed appointments", () => {
    const late = { ...appointment, id: "later", scheduledStartAt: "2026-11-04T11:00:00Z", scheduledEndAt: "2026-11-04T11:20:00Z" };
    const result = todaysPatients([late, { ...appointment, id: "closed", status: "COMPLETED" },
      { ...appointment, id: "cancelled", status: "CANCELLED" }, appointment,
      { ...appointment, id: "next-day", scheduledStartAt: "2026-11-04T18:00:00Z" }], now);
    expect(result.today).toHaveLength(4);
    expect(result.completed).toBe(1);
    expect(result.remaining.map((a) => a.id)).toEqual([appointment.id, "later"]);
    expect(result.next?.id).toBe(appointment.id);
  });
  it("retains overdue patients without silently marking them absent", () => {
    const result = todaysPatients([appointment], new Date("2026-11-04T12:00:00Z"));
    expect(result.remaining).toHaveLength(1);
    expect(result.next?.status).toBe("CONFIRMED");
  });
  it("enforces exact video boundaries and never treats unpaid booking as eligible", () => {
    expect(videoEntry(appointment, new Date("2026-11-04T09:54:59Z")).available).toBe(false);
    expect(videoEntry(appointment, new Date("2026-11-04T09:55:00Z")).available).toBe(true);
    expect(videoEntry(appointment, new Date("2026-11-04T10:20:00Z")).available).toBe(false);
    expect(videoEntry({ ...appointment, status: "PENDING_PAYMENT" }, now).available).toBe(false);
    expect(videoEntry({ ...appointment, mode: "CHAMBER" }, now).available).toBe(false);
  });
  it("uses the beneficiary's identity and never substitutes the owner's age or gender", () => {
    const family = { ...appointment, familyMemberId: "family-a", familyMember: { id: "family-a", name: "Synthetic Child", relationship: "Child" } };
    const identity = patientIdentity(family, now);
    expect(identity.name).toBe("Synthetic Child");
    expect(identity.subtitle).toContain("Booked by Synthetic Patient");
    expect(identity.subtitle).not.toMatch(/years|Female/);
    const html = renderToString(<PatientRecordsPanel appointment={family} onClose={vi.fn()} />);
    expect(html).toContain("Separate family-member history is not available");
    expect(html).not.toContain("Loading patient clinical history");
  });
  it("preserves legacy links by redirecting to sidebar destinations", () => {
    expect(legacyDashboardPath("schedule")).toBe("/doctor/schedule");
    expect(legacyDashboardPath("profile")).toBe("/doctor/profile");
    expect(legacyDashboardPath("analytics")).toBe("/doctor/earnings");
    expect(legacyDashboardPath("queue")).toBeNull();
  });
  it("renders real appointment details with neutral readiness and no invented payment confirmation", () => {
    const html = renderToString(<MemoryRouter><FocusedPatientCard appointment={appointment}
      now={now} selected={false} onOpen={vi.fn()} onReset={vi.fn()} /></MemoryRouter>);
    expect(html).toContain("Synthetic Patient");
    expect(html).toContain("Join video");
    expect(html).toContain("Video readiness unavailable");
    expect(html).not.toMatch(/Ready · Waiting|Online|Paid|Clinical EHR/);
  });
  it("makes each queue patient selectable and keeps readiness limited to video appointments", () => {
    const html = renderToString(<MemoryRouter><PatientQueue appointments={[appointment, { ...appointment, id: "chamber", mode: "CHAMBER" }]}
      onSelect={vi.fn()} onReadiness={vi.fn()} /></MemoryRouter>);
    expect(html.match(/Open patient Synthetic Patient/g)).toHaveLength(2);
    expect(html.match(/Video readiness unavailable for/g)).toHaveLength(1);
  });
});
