import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { DataSource } from "typeorm";
import { Appointment, AppointmentStatus } from "../src/modules/appointments/appointment.entity";
import { AppointmentSlot, AppointmentSlotStatus } from "../src/modules/scheduling/appointment-slot.entity";
import { ConsultationMode } from "../src/modules/appointments/consultation-mode";
import { SlotHold, SlotHoldStatus } from "../src/modules/appointments/slot-hold.entity";
import { Payment } from "../src/modules/payments/payment.entity";
import { PaymentEvent } from "../src/modules/payments/payment-event.entity";
import { TypeOrmPaymentRepository } from "../src/modules/payments/typeorm-payment.repository";
import type { VerifiedTransaction } from "../src/modules/payments/payment.types";

/** In-memory persistence double tests workflow decisions; it does not prove MySQL locking. */
function fixture() {
  const now = new Date();
  const expiry = new Date(now.getTime() + 600000);
  const slot = Object.assign(new AppointmentSlot(), { id: randomUUID(), status: AppointmentSlotStatus.HELD, heldUntil: expiry });
  const hold = Object.assign(new SlotHold(), { id: randomUUID(), slotId: slot.id, status: SlotHoldStatus.ACTIVE, expiresAt: expiry });
  const appointment = Object.assign(new Appointment(), { id: randomUUID(), patientProfileId: randomUUID(),
    holdId: hold.id, slotId: slot.id, mode: ConsultationMode.VIDEO, feeAmount: "800.00", status: AppointmentStatus.PENDING_PAYMENT });
  const payment = Object.assign(new Payment(), { id: randomUUID(), appointmentId: appointment.id, patientProfileId: appointment.patientProfileId,
    transactionId: "MCtest", amount: "800.00", currency: "BDT", status: "PENDING", expiresAt: expiry,
    idempotencyKey: "original_key_12345", requestHash: "hash", gatewayUrl: "https://sandbox.sslcommerz.com/pay" });
  const tables = new Map<unknown, any[]>([[AppointmentSlot, [slot]], [SlotHold, [hold]], [Appointment, [appointment]], [Payment, [payment]], [PaymentEvent, []]]);
  const matches = (row: any, where: any) => Object.entries(where).every(([key, value]) => row[key] === value);
  const manager = {
    getRepository(entity: unknown) {
      const rows = tables.get(entity)!;
      return {
        create: (input: any) => ({ id: randomUUID(), ...input }),
        find: async (options: any) => {
          if (entity !== SlotHold) return [...rows];
          const boundary = options.where.expiresAt._value as Date;
          return rows
            .filter((row) => row.status === options.where.status && row.expiresAt <= boundary)
            .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime())
            .slice(0, options.take);
        },
        findOneBy: async (where: any) => rows.find((row) => matches(row, where)) ?? null,
        findOne: async ({ where }: any) => rows.find((row) => matches(row, where)) ?? null,
        findOneOrFail: async ({ where }: any) => { const row = rows.find((item) => matches(item, where)); if (!row) throw new Error("Missing fixture row"); return row; },
        findOneByOrFail: async (where: any) => { const row = rows.find((item) => matches(item, where)); if (!row) throw new Error("Missing fixture row"); return row; },
        save: async (row: any) => { if (!rows.includes(row)) rows.push(row); return row; },
        update: async (where: any, values: any) => { for (const row of rows) if (matches(row, where)) Object.assign(row, values); },
      };
    },
  };
  const source = { transaction: async (work: (value: unknown) => Promise<unknown>) => work(manager), getRepository: manager.getRepository } as unknown as DataSource;
  const transaction: VerifiedTransaction = { transactionId: "MCtest", amount: "800.00", currency: "BDT", status: "VALID",
    validationId: "validation", bankTransactionId: "bank", riskLevel: "0" };
  return { now, slot, hold, appointment, payment, tables, transaction, repository: new TypeOrmPaymentRepository(source) };
}

describe("payment booking decisions", () => {
  it("confirms one payment, converts its hold and books the slot", async () => {
    const f = fixture();
    const result = await f.repository.applyVerified(f.payment.id, f.transaction, f.now);
    expect(result.status).toBe("SUCCEEDED");
    expect(f.appointment.status).toBe(AppointmentStatus.CONFIRMED);
    expect(f.appointment.paymentReference).toBe("MCtest");
    expect(f.hold.status).toBe(SlotHoldStatus.CONVERTED);
    expect(f.slot.status).toBe(AppointmentSlotStatus.BOOKED);
    expect(f.slot.heldUntil).toBeNull();
  });

  it("deduplicates VALID and VALIDATED callbacks for the same charge", async () => {
    const f = fixture();
    await f.repository.applyVerified(f.payment.id, f.transaction, f.now);
    await f.repository.applyVerified(f.payment.id, { ...f.transaction, status: "VALIDATED" }, f.now);
    expect(f.tables.get(PaymentEvent)).toHaveLength(1);
    expect(f.appointment.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it("does not downgrade success when a later failed notification arrives", async () => {
    const f = fixture();
    await f.repository.applyVerified(f.payment.id, f.transaction, f.now);
    await f.repository.applyVerified(f.payment.id, { ...f.transaction, status: "FAILED" }, f.now);
    expect(f.payment.status).toBe("SUCCEEDED");
    expect(f.slot.status).toBe(AppointmentSlotStatus.BOOKED);
  });

  it.each(["FAILED", "CANCELLED"] as const)("releases the booking on verified %s", async (status) => {
    const f = fixture();
    await f.repository.applyVerified(f.payment.id, { ...f.transaction, status }, f.now);
    expect(f.payment.status).toBe(status);
    expect(f.appointment.status).toBe(AppointmentStatus.CANCELLED);
    expect(f.hold.status).toBe(SlotHoldStatus.RELEASED);
    expect(f.slot.status).toBe(AppointmentSlotStatus.AVAILABLE);
  });

  it("sends late success to review and preserves a newly booked slot", async () => {
    const f = fixture();
    f.hold.status = SlotHoldStatus.EXPIRED;
    f.appointment.status = AppointmentStatus.PAYMENT_EXPIRED;
    f.slot.status = AppointmentSlotStatus.BOOKED;
    await f.repository.applyVerified(f.payment.id, f.transaction, f.now);
    expect(f.payment.status).toBe("REVIEW_REQUIRED");
    expect(f.appointment.status).toBe(AppointmentStatus.PAYMENT_EXPIRED);
    expect(f.slot.status).toBe(AppointmentSlotStatus.BOOKED);
  });

  it("holds a risk-flagged successful charge for review", async () => {
    const f = fixture();
    await f.repository.applyVerified(f.payment.id, { ...f.transaction, riskLevel: "1" }, f.now);
    expect(f.payment.status).toBe("REVIEW_REQUIRED");
    expect(f.appointment.status).toBe(AppointmentStatus.PENDING_PAYMENT);
    expect(f.slot.status).toBe(AppointmentSlotStatus.HELD);
  });

  it("does not release a slot for a stale failed payment whose hold was already consumed", async () => {
    const f = fixture();
    f.hold.status = SlotHoldStatus.EXPIRED;
    f.slot.heldUntil = new Date(f.now.getTime() + 900000);
    await f.repository.applyVerified(f.payment.id, { ...f.transaction, status: "FAILED" }, f.now);
    expect(f.slot.status).toBe(AppointmentSlotStatus.HELD);
    expect(f.slot.heldUntil.getTime()).toBe(f.now.getTime() + 900000);
  });

  it("rejects reuse of an idempotency key with a changed payload", async () => {
    const f = fixture();
    await expect(f.repository.prepare(f.payment.patientProfileId, f.appointment.id, f.payment.idempotencyKey, f.now, "changed")).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("does not expose another patient's payment", async () => {
    const f = fixture();
    expect(await f.repository.findOwned(f.payment.id, randomUUID())).toBeNull();
  });

  it("expires an unpaid appointment, payment, hold, and matching slot together", async () => {
    const f = fixture();
    f.hold.expiresAt = f.now;
    f.slot.heldUntil = f.now;
    f.payment.expiresAt = f.now;

    const result = await f.repository.expireUnpaidHolds(f.now, 100);

    expect(result).toEqual({ candidates: 1, expired: 1, protected: 0, skipped: 0 });
    expect(f.payment.status).toBe("EXPIRED");
    expect(f.appointment.status).toBe(AppointmentStatus.PAYMENT_EXPIRED);
    expect(f.hold.status).toBe(SlotHoldStatus.EXPIRED);
    expect(f.slot.status).toBe(AppointmentSlotStatus.AVAILABLE);
    expect(f.slot.heldUntil).toBeNull();
    expect(await f.repository.expireUnpaidHolds(f.now, 100)).toEqual({
      candidates: 0,
      expired: 0,
      protected: 0,
      skipped: 0,
    });
  });

  it("never releases a confirmed or successfully paid booking", async () => {
    const f = fixture();
    f.hold.expiresAt = f.now;
    f.slot.heldUntil = f.now;
    f.payment.status = "SUCCEEDED";
    f.appointment.status = AppointmentStatus.CONFIRMED;

    const result = await f.repository.expireUnpaidHolds(f.now, 100);

    expect(result).toEqual({ candidates: 1, expired: 0, protected: 1, skipped: 0 });
    expect(f.hold.status).toBe(SlotHoldStatus.ACTIVE);
    expect(f.slot.status).toBe(AppointmentSlotStatus.HELD);
    expect(f.payment.status).toBe("SUCCEEDED");
    expect(f.appointment.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it("does not release a slot whose reservation window belongs to newer work", async () => {
    const f = fixture();
    f.hold.expiresAt = f.now;
    const newerHeldUntil = new Date(f.now.getTime() + 600_000);
    f.slot.heldUntil = newerHeldUntil;

    const result = await f.repository.expireUnpaidHolds(f.now, 100);

    expect(result.expired).toBe(1);
    expect(f.hold.status).toBe(SlotHoldStatus.EXPIRED);
    expect(f.slot.status).toBe(AppointmentSlotStatus.HELD);
    expect(f.slot.heldUntil).toBe(newerHeldUntil);
  });
});
