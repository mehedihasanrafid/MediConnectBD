import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppointmentStatus } from "../src/modules/appointments/appointment.entity";
import { ConsultationMode } from "../src/modules/appointments/consultation-mode";
import { SlotHoldStatus } from "../src/modules/appointments/slot-hold.entity";
import type { AppointmentRepository } from "../src/modules/appointments/appointment.repository";
import { AppointmentService } from "../src/modules/appointments/appointment.service";
import type {
  AppointmentView,
  BookHoldResult,
  CancelAppointmentResult,
  CreateHoldResult,
  ReleaseHoldResult,
  SlotHoldView,
} from "../src/modules/appointments/appointment.types";

const now = new Date("2026-10-18T06:00:00.000Z");
const patientProfileId = randomUUID();
const slotId = randomUUID();
const holdId = randomUUID();

function hold(): SlotHoldView {
  return {
    id: holdId,
    patientProfileId,
    status: SlotHoldStatus.ACTIVE,
    expiresAt: new Date("2026-10-18T06:10:00.000Z"),
    createdAt: now,
    slot: {
      id: slotId,
      doctorId: randomUUID(),
      startAt: new Date("2026-10-19T04:00:00.000Z"),
      endAt: new Date("2026-10-19T04:20:00.000Z"),
      mode: ConsultationMode.VIDEO,
      feeAmount: 800,
      chamber: null,
    },
  };
}

function appointment(): AppointmentView {
  const slot = hold().slot;
  return {
    id: randomUUID(),
    patientProfileId,
    doctorId: slot.doctorId,
    holdId,
    status: AppointmentStatus.PENDING_PAYMENT,
    scheduledStartAt: slot.startAt,
    scheduledEndAt: slot.endAt,
    mode: slot.mode,
    feeAmount: slot.feeAmount,
    paymentRequired: true,
    paymentReference: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    slot,
  };
}

class FakeAppointmentRepository implements AppointmentRepository {
  createResult: CreateHoldResult = { kind: "CREATED", hold: hold() };
  bookResult: BookHoldResult = { kind: "BOOKED", appointment: appointment() };
  releaseResult: ReleaseHoldResult = { kind: "RELEASED" };
  cancelResult: CancelAppointmentResult = {
    kind: "CANCELLED",
    outcome: {
      appointment: { ...appointment(), status: AppointmentStatus.CANCELLED },
      refundPercent: 100,
      refundAmount: "800.00",
      refundId: randomUUID(),
    },
  };
  createInput: Parameters<AppointmentRepository["createHold"]>[0] | null = null;

  async createHold(
    input: Parameters<AppointmentRepository["createHold"]>[0],
  ): Promise<CreateHoldResult> {
    this.createInput = input;
    return this.createResult;
  }

  async bookHold(): Promise<BookHoldResult> {
    return this.bookResult;
  }

  async releaseHold(): Promise<ReleaseHoldResult> {
    return this.releaseResult;
  }

  async listPatientAppointments(): Promise<AppointmentView[]> {
    return [appointment()];
  }

  async cancelAppointment(): Promise<CancelAppointmentResult> {
    return this.cancelResult;
  }
}

describe("AppointmentService", () => {
  it("creates a ten-minute hold with a one-hour booking boundary", async () => {
    const repository = new FakeAppointmentRepository();
    const service = new AppointmentService(repository, () => now);

    const result = await service.holdSlot(patientProfileId, slotId);

    expect(result.id).toBe(holdId);
    expect(repository.createInput?.expiresAt.toISOString()).toBe(
      "2026-10-18T06:10:00.000Z",
    );
    expect(repository.createInput?.minimumStartAt.toISOString()).toBe(
      "2026-10-18T07:00:00.000Z",
    );
  });

  it("reports a conflict when another patient already holds the slot", async () => {
    const repository = new FakeAppointmentRepository();
    repository.createResult = { kind: "SLOT_UNAVAILABLE" };
    const service = new AppointmentService(repository, () => now);

    await expect(service.holdSlot(patientProfileId, slotId)).rejects.toMatchObject({
      statusCode: 409,
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("reports an expired hold instead of creating an appointment", async () => {
    const repository = new FakeAppointmentRepository();
    repository.bookResult = { kind: "HOLD_EXPIRED" };
    const service = new AppointmentService(repository, () => now);

    await expect(service.bookAppointment(patientProfileId, holdId)).rejects.toMatchObject({
      statusCode: 409,
      code: "HOLD_EXPIRED",
    });
  });

  it("returns the patient's own appointment history", async () => {
    const repository = new FakeAppointmentRepository();
    const service = new AppointmentService(repository, () => now);

    const items = await service.listMyAppointments(patientProfileId);

    expect(items).toHaveLength(1);
    expect(items[0]?.patientProfileId).toBe(patientProfileId);
  });

  it("returns the refund decision when a patient cancels", async () => {
    const repository = new FakeAppointmentRepository();
    const service = new AppointmentService(repository, () => now);

    const outcome = await service.cancelAppointment("PATIENT", patientProfileId, randomUUID(), "Schedule conflict");

    expect(outcome.refundPercent).toBe(100);
    expect(outcome.refundAmount).toBe("800.00");
    expect(outcome.appointment.status).toBe(AppointmentStatus.CANCELLED);
  });

  it("refuses to cancel another patient's appointment", async () => {
    const repository = new FakeAppointmentRepository();
    repository.cancelResult = { kind: "APPOINTMENT_FORBIDDEN" };
    const service = new AppointmentService(repository, () => now);

    await expect(
      service.cancelAppointment("PATIENT", patientProfileId, randomUUID(), "Schedule conflict"),
    ).rejects.toMatchObject({ statusCode: 403, code: "APPOINTMENT_FORBIDDEN" });
  });

  it("reports a missing appointment", async () => {
    const repository = new FakeAppointmentRepository();
    repository.cancelResult = { kind: "APPOINTMENT_NOT_FOUND" };
    const service = new AppointmentService(repository, () => now);

    await expect(
      service.cancelAppointment("PATIENT", patientProfileId, randomUUID(), "Schedule conflict"),
    ).rejects.toMatchObject({ statusCode: 404, code: "APPOINTMENT_NOT_FOUND" });
  });

  it("refuses to cancel a completed appointment", async () => {
    const repository = new FakeAppointmentRepository();
    repository.cancelResult = { kind: "APPOINTMENT_NOT_CANCELLABLE" };
    const service = new AppointmentService(repository, () => now);

    await expect(
      service.cancelAppointment("PATIENT", patientProfileId, randomUUID(), "Schedule conflict"),
    ).rejects.toMatchObject({ statusCode: 409, code: "APPOINTMENT_NOT_CANCELLABLE" });
  });

  it("treats a repeated cancellation as idempotent", async () => {
    const repository = new FakeAppointmentRepository();
    repository.cancelResult = {
      kind: "ALREADY_CANCELLED",
      outcome: {
        appointment: { ...appointment(), status: AppointmentStatus.CANCELLED },
        refundPercent: 100,
        refundAmount: "0.00",
        refundId: null,
      },
    };
    const service = new AppointmentService(repository, () => now);

    const outcome = await service.cancelAppointment("PATIENT", patientProfileId, randomUUID(), "Schedule conflict");

    expect(outcome.refundId).toBeNull();
    expect(outcome.refundAmount).toBe("0.00");
  });
});
