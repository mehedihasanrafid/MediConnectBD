import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DataSource } from "typeorm";
import { Appointment, AppointmentStatus } from "../src/modules/appointments/appointment.entity";
import { AppointmentSlot, AppointmentSlotStatus } from "../src/modules/scheduling/appointment-slot.entity";
import { ConsultationMode } from "../src/modules/appointments/consultation-mode";
import { DoctorProfile, DoctorApplicationStatus } from "../src/modules/doctors/doctor-profile.entity";
import { PatientProfile } from "../src/modules/patients/patient-profile.entity";
import { Payment } from "../src/modules/payments/payment.entity";
import { PaymentEvent } from "../src/modules/payments/payment-event.entity";
import { SlotHold, SlotHoldStatus } from "../src/modules/appointments/slot-hold.entity";
import { User, UserStatus } from "../src/modules/users/user.entity";
import { TypeOrmPaymentRepository } from "../src/modules/payments/typeorm-payment.repository";
import type { VerifiedTransaction } from "../src/modules/payments/payment.types";

const socketPath = process.env.MYSQL_PAYMENT_TEST_SOCKET;
// A separate disposable server is mandatory: never aim this suite at a developer database.
if (socketPath && !/^\/tmp\/mediconnect-payment-mysql-[A-Za-z0-9]+\/mysql\.sock$/.test(socketPath)) {
  throw new Error("Payment integration tests require a disposable /tmp MySQL socket");
}

describe.skipIf(!socketPath)("payment MySQL integration", () => {
  let source: DataSource;
  beforeAll(async () => {
    const { default: AppDataSource } = await import("../src/database/data-source");
    source = new DataSource({ ...AppDataSource.options, host: "localhost", username: "root", password: "",
      database: "mediconnect_payment_verification", extra: { socketPath }, logging: false });
    await source.initialize();
    await source.runMigrations();
  }, 30000);
  afterAll(async () => { if (source?.isInitialized) await source.destroy(); });

  async function fixture() {
    const user = await source.getRepository(User).save(source.getRepository(User).create({ email: `${randomUUID()}@payment-test.example`,
      passwordHash: "synthetic-not-a-login", firstName: "Payment", lastName: "Verification", status: UserStatus.ACTIVE }));
    const patient = await source.getRepository(PatientProfile).save(source.getRepository(PatientProfile).create({ userId: user.id }));
    const doctor = await source.getRepository(DoctorProfile).save(source.getRepository(DoctorProfile).create({ userId: user.id,
      bmdcNumber: `TEST-${randomUUID()}`, applicationStatus: DoctorApplicationStatus.APPROVED }));
    const now = new Date();
    const expiry = new Date(now.getTime() + 600000);
    const slot = await source.getRepository(AppointmentSlot).save(source.getRepository(AppointmentSlot).create({ doctorProfileId: doctor.id,
      startAt: new Date(now.getTime() + 7200000), endAt: new Date(now.getTime() + 8400000), mode: ConsultationMode.VIDEO,
      feeAmount: "800.00", status: AppointmentSlotStatus.HELD, heldUntil: expiry }));
    const hold = await source.getRepository(SlotHold).save(source.getRepository(SlotHold).create({ slotId: slot.id, patientProfileId: patient.id,
      status: SlotHoldStatus.ACTIVE, expiresAt: expiry }));
    const appointment = await source.getRepository(Appointment).save(source.getRepository(Appointment).create({ slotId: slot.id, holdId: hold.id,
      patientProfileId: patient.id, doctorProfileId: doctor.id, mode: ConsultationMode.VIDEO, feeAmount: "800.00",
      scheduledStartAt: slot.startAt, scheduledEndAt: slot.endAt, status: AppointmentStatus.PENDING_PAYMENT }));
    const repository = new TypeOrmPaymentRepository(source);
    const key = randomUUID();
    const prepared = await repository.prepare(patient.id, appointment.id, key, now, "a".repeat(64));
    const transaction: VerifiedTransaction = { transactionId: prepared.payment.transactionId, amount: "800.00", currency: "BDT",
      status: "VALID", validationId: randomUUID(), bankTransactionId: randomUUID(), riskLevel: "0" };
    return { now, patient, doctor, user, slot, hold, appointment, repository, key, payment: prepared.payment, transaction,
      async cleanup() {
        // Delete only the UUIDs created by this fixture, in foreign-key order.
        await source.getRepository(PaymentEvent).delete({ paymentId: prepared.payment.id });
        await source.getRepository(Payment).delete({ id: prepared.payment.id });
        await source.getRepository(Appointment).delete({ id: appointment.id });
        await source.getRepository(SlotHold).delete({ id: hold.id });
        await source.getRepository(AppointmentSlot).delete({ id: slot.id });
        await source.getRepository(DoctorProfile).delete({ id: doctor.id });
        await source.getRepository(PatientProfile).delete({ id: patient.id });
        await source.getRepository(User).delete({ id: user.id });
      } };
  }

  it("applies concurrent duplicate callbacks exactly once under real row locks", async () => {
    const f = await fixture();
    try {
      const settled = await Promise.allSettled(Array.from({ length: 5 }, () => f.repository.applyVerified(f.payment.id, f.transaction, f.now)));
      for (const result of settled) if (result.status === "rejected") throw result.reason;
      const results = settled.map((result) => result.status === "fulfilled" ? result.value : null);
      expect(results.every((payment) => payment?.status === "SUCCEEDED")).toBe(true);
      expect(await source.getRepository(PaymentEvent).countBy({ paymentId: f.payment.id })).toBe(1);
      expect((await source.getRepository(Appointment).findOneByOrFail({ id: f.appointment.id })).status).toBe(AppointmentStatus.CONFIRMED);
      expect((await source.getRepository(AppointmentSlot).findOneByOrFail({ id: f.slot.id })).status).toBe(AppointmentSlotStatus.BOOKED);
      expect((await source.getRepository(SlotHold).findOneByOrFail({ id: f.hold.id })).status).toBe(SlotHoldStatus.CONVERTED);
    } finally { await f.cleanup(); }
  });

  it("serializes concurrent initiation retries to a single payment", async () => {
    const f = await fixture();
    try {
      await source.getRepository(Payment).delete({ id: f.payment.id });
      const settled = await Promise.allSettled(Array.from({ length: 4 }, () => f.repository.prepare(f.patient.id, f.appointment.id, f.key, f.now, "a".repeat(64))));
      const results = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      if (results[0]) f.payment.id = results[0].payment.id;
      for (const result of settled) if (result.status === "rejected") throw result.reason;
      expect(results.every((result) => result.payment.id === f.payment.id)).toBe(true);
      expect(results.filter((result) => result.created)).toHaveLength(1);
      expect(await source.getRepository(Payment).countBy({ appointmentId: f.appointment.id })).toBe(1);
    } finally { await f.cleanup(); }
  });

  it("rolls back event and booking updates together when an insert fails", async () => {
    const f = await fixture();
    try {
      // A schema-level length failure occurs before any confirmation can commit.
      await expect(f.repository.applyVerified(f.payment.id, { ...f.transaction, validationId: "x".repeat(101) }, f.now)).rejects.toBeDefined();
      expect(await source.getRepository(PaymentEvent).countBy({ paymentId: f.payment.id })).toBe(0);
      expect((await source.getRepository(Appointment).findOneByOrFail({ id: f.appointment.id })).status).toBe(AppointmentStatus.PENDING_PAYMENT);
      expect((await source.getRepository(Payment).findOneByOrFail({ id: f.payment.id })).status).toBe("INITIATED");
    } finally { await f.cleanup(); }
  });

  it("records late payment without reclaiming an expired hold", async () => {
    const f = await fixture();
    try {
      await source.getRepository(SlotHold).update({ id: f.hold.id }, { status: SlotHoldStatus.EXPIRED });
      await source.getRepository(AppointmentSlot).update({ id: f.slot.id }, { status: AppointmentSlotStatus.AVAILABLE, heldUntil: null });
      const result = await f.repository.applyVerified(f.payment.id, f.transaction, f.now);
      expect(result.status).toBe("REVIEW_REQUIRED");
      expect((await source.getRepository(AppointmentSlot).findOneByOrFail({ id: f.slot.id })).status).toBe(AppointmentSlotStatus.AVAILABLE);
    } finally { await f.cleanup(); }
  });

  it("expires an unpaid hold atomically in real MySQL", async () => {
    const f = await fixture();
    try {
      const expiredAt = new Date(f.now.getTime() - 1);
      await source.getRepository(SlotHold).update(
        { id: f.hold.id },
        { expiresAt: expiredAt },
      );
      await source.getRepository(AppointmentSlot).update(
        { id: f.slot.id },
        { heldUntil: expiredAt },
      );
      await source.getRepository(Payment).update(
        { id: f.payment.id },
        { expiresAt: expiredAt },
      );

      const result = await f.repository.expireUnpaidHolds(f.now, 100);

      expect(result.expired).toBe(1);
      expect((await source.getRepository(Payment).findOneByOrFail({ id: f.payment.id })).status).toBe("EXPIRED");
      expect((await source.getRepository(Appointment).findOneByOrFail({ id: f.appointment.id })).status).toBe(AppointmentStatus.PAYMENT_EXPIRED);
      expect((await source.getRepository(SlotHold).findOneByOrFail({ id: f.hold.id })).status).toBe(SlotHoldStatus.EXPIRED);
      const slot = await source.getRepository(AppointmentSlot).findOneByOrFail({ id: f.slot.id });
      expect(slot.status).toBe(AppointmentSlotStatus.AVAILABLE);
      expect(slot.heldUntil).toBeNull();
    } finally { await f.cleanup(); }
  });
});
