/**
 * Payment ledger and booking-state transaction boundary. One payment per appointment plus
 * patient/idempotency-key uniqueness prevents duplicate checkout records. Verified events and
 * eligible booking transitions commit together.
 */

import { createHash, randomBytes } from "node:crypto";
import type { DataSource } from "typeorm";
import { AppError } from "../../utils/app-error";
import { Appointment, AppointmentStatus } from "../appointments/appointment.entity";
import { AppointmentSlot, AppointmentSlotStatus } from "../scheduling/appointment-slot.entity";
import { ConsultationMode } from "../appointments/consultation-mode";
import { Payment } from "./payment.entity";
import { PaymentEvent } from "./payment-event.entity";
import { SlotHold, SlotHoldStatus } from "../appointments/slot-hold.entity";
import type { PaymentRepository } from "./payment.repository";
import { decimalAmount, type PaymentView, type VerifiedTransaction } from "./payment.types";

export class TypeOrmPaymentRepository implements PaymentRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Locks the booking, validates the original hold, and reserves one payment per
   * appointment/idempotency key. Provider I/O happens after this transaction.
   */
  async prepare(patientId: string, appointmentId: string, key: string, now: Date, requestHash: string): Promise<{ payment: PaymentView; created: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const appointments = manager.getRepository(Appointment);
      const initial = await appointments.findOneBy({ id: appointmentId, patientProfileId: patientId });
      if (!initial) throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
      const hold = await manager.getRepository(SlotHold).findOne({ where: { id: initial.holdId }, lock: { mode: "pessimistic_write" } });
      const slot = await manager.getRepository(AppointmentSlot).findOne({ where: { id: initial.slotId }, lock: { mode: "pessimistic_write" } });
      const appointment = await appointments.findOneOrFail({ where: { id: initial.id }, lock: { mode: "pessimistic_write" } });
      const payments = manager.getRepository(Payment);
      // MySQL REPEATABLE READ snapshots may predate a lock wait. Use current reads
      // for deduplication after acquiring the booking locks.
      const keyPayment = await payments.findOne({ where: { patientProfileId: patientId, idempotencyKey: key }, lock: { mode: "pessimistic_write" } });
      if (keyPayment && (keyPayment.appointmentId !== appointmentId || keyPayment.requestHash !== requestHash)) {
        throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for another request");
      }
      const existing = await payments.findOne({ where: { appointmentId }, lock: { mode: "pessimistic_write" } });
      if (existing) {
        if (existing.idempotencyKey !== key || existing.requestHash !== requestHash) {
          throw new AppError(409, "PAYMENT_ALREADY_EXISTS", "A payment already exists for this appointment; use the original request key");
        }
        return { payment: this.view(existing), created: false };
      }
      if (appointment.mode !== ConsultationMode.VIDEO || appointment.status !== AppointmentStatus.PENDING_PAYMENT) {
        throw new AppError(409, "PAYMENT_NOT_REQUIRED", "This appointment is not awaiting a video payment");
      }
      if (!hold || !slot || hold.status !== SlotHoldStatus.ACTIVE || hold.expiresAt <= now ||
        slot.status !== AppointmentSlotStatus.HELD || !slot.heldUntil || slot.heldUntil <= now) {
        throw new AppError(409, "PAYMENT_WINDOW_EXPIRED", "The payment hold has expired; book a new slot");
      }
      const amount = decimalAmount(appointment.feeAmount);
      if (Number(amount) < 10 || Number(amount) > 500000) {
        throw new AppError(409, "PAYMENT_AMOUNT_UNSUPPORTED", "Sandbox payments require an amount between 10 and 500000 BDT");
      }
      const payment = await payments.save(payments.create({ appointmentId, patientProfileId: patientId,
        transactionId: `MC${randomBytes(14).toString("hex")}`, idempotencyKey: key, requestHash,
        amount, currency: "BDT", status: "INITIATED", sessionId: null, gatewayUrl: null,
        validationId: null, bankTransactionId: null, expiresAt: hold.expiresAt }));
      return { payment: this.view(payment), created: true };
    }).catch((error: unknown) => {
      if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") {
        throw new AppError(409, "PAYMENT_ALREADY_EXISTS", "A payment already exists for this appointment or request key");
      }
      throw error;
    });
  }

  /**
   * Attaches checkout metadata only while INITIATED so a fast provider callback cannot be
   * overwritten by PENDING.
   */
  async saveSession(id: string, sessionId: string, gatewayUrl: string): Promise<PaymentView> {
    // A callback may arrive before the create-session response; never downgrade it.
    await this.dataSource.getRepository(Payment).update({ id, status: "INITIATED" }, { sessionId, gatewayUrl, status: "PENDING" });
    return this.view(await this.dataSource.getRepository(Payment).findOneByOrFail({ id }));
  }

  async findOwned(id: string, patientId: string): Promise<PaymentView | null> {
    const payment = await this.dataSource.getRepository(Payment).findOneBy({ id, patientProfileId: patientId });
    return payment ? this.view(payment) : null;
  }

  async findByTransaction(transactionId: string): Promise<PaymentView | null> {
    const payment = await this.dataSource.getRepository(Payment).findOneBy({ transactionId });
    return payment ? this.view(payment) : null;
  }

  /**
   * Expects details already verified by PaymentService. Locks hold, slot, appointment, and
   * payment, then records evidence and applies one eligible booking transition.
   */
  async applyVerified(id: string, transaction: VerifiedTransaction, now: Date): Promise<PaymentView> {
    return this.dataSource.transaction(async (manager) => {
      const payments = manager.getRepository(Payment);
      const initial = await payments.findOneByOrFail({ id });
      const appointments = manager.getRepository(Appointment);
      const initialAppointment = await appointments.findOneByOrFail({ id: initial.appointmentId });
      const holds = manager.getRepository(SlotHold);
      const slots = manager.getRepository(AppointmentSlot);
      const hold = await holds.findOneOrFail({ where: { id: initialAppointment.holdId }, lock: { mode: "pessimistic_write" } });
      const slot = await slots.findOneOrFail({ where: { id: initialAppointment.slotId }, lock: { mode: "pessimistic_write" } });
      const appointment = await appointments.findOneOrFail({ where: { id: initial.appointmentId }, lock: { mode: "pessimistic_write" } });
      const payment = await payments.findOneOrFail({ where: { id }, lock: { mode: "pessimistic_write" } });
      const events = manager.getRepository(PaymentEvent);
      // VALID and VALIDATED represent the same successful charge.
      const providerStatus = transaction.status === "VALIDATED" ? "VALID" : transaction.status;
      const fingerprint = createHash("sha256").update(JSON.stringify([transaction.transactionId, providerStatus,
        decimalAmount(transaction.amount), transaction.currency, transaction.validationId, transaction.bankTransactionId, transaction.riskLevel])).digest("hex");
      if (await events.findOne({ where: { paymentId: id, fingerprint }, lock: { mode: "pessimistic_write" } })) return this.view(payment);
      await events.save(events.create({ paymentId: id, fingerprint, providerStatus,
        riskLevel: transaction.riskLevel, validationId: transaction.validationId,
        amount: decimalAmount(transaction.amount), currency: transaction.currency }));

      // Keep the verified event for audit, but never downgrade success or auto-resolve a review case.
      if (payment.status === "SUCCEEDED" || payment.status === "REVIEW_REQUIRED") return this.view(payment);
      const success = providerStatus === "VALID";
      const active = appointment.status === AppointmentStatus.PENDING_PAYMENT && hold.status === SlotHoldStatus.ACTIVE &&
        hold.expiresAt > now && slot.status === AppointmentSlotStatus.HELD && slot.heldUntil !== null && slot.heldUntil > now;
      if (success) {
        payment.validationId = transaction.validationId;
        payment.bankTransactionId = transaction.bankTransactionId;
        if (active && transaction.riskLevel === "0" && (payment.status === "INITIATED" || payment.status === "PENDING")) {
          payment.status = "SUCCEEDED";
          appointment.status = AppointmentStatus.CONFIRMED;
          appointment.paymentReference = payment.transactionId;
          hold.status = SlotHoldStatus.CONVERTED;
          hold.releasedAt = now;
          slot.status = AppointmentSlotStatus.BOOKED;
          slot.heldUntil = null;
          await appointments.save(appointment);
          await holds.save(hold);
          await slots.save(slot);
        } else {
          // A real charge after expiry or a risk flag requires reconciliation/refund.
          payment.status = "REVIEW_REQUIRED";
        }
      } else if (providerStatus === "FAILED" || providerStatus === "CANCELLED") {
        payment.status = providerStatus;
        if (appointment.status === AppointmentStatus.PENDING_PAYMENT) {
          appointment.status = AppointmentStatus.CANCELLED;
          appointment.cancellationReason = `Payment ${providerStatus.toLowerCase()}`;
          await appointments.save(appointment);
        }
        if (hold.status === SlotHoldStatus.ACTIVE) {
          hold.status = SlotHoldStatus.RELEASED;
          hold.releasedAt = now;
          await holds.save(hold);
          // The slot may already carry a newer hold. Release only the matching reservation window.
          if (slot.status === AppointmentSlotStatus.HELD && slot.heldUntil?.getTime() === hold.expiresAt.getTime()) {
            slot.status = AppointmentSlotStatus.AVAILABLE;
            slot.heldUntil = null;
            await slots.save(slot);
          }
        }
      }
      return this.view(await payments.save(payment));
    });
  }

  /**
   * Exposes a checkout URL only for an unexpired PENDING payment; hiding it does not itself expire
   * database state.
   */
  private view(payment: Payment): PaymentView {
    return { id: payment.id, appointmentId: payment.appointmentId, patientProfileId: payment.patientProfileId,
      transactionId: payment.transactionId, amount: payment.amount, currency: payment.currency,
      status: payment.status, gatewayUrl: payment.status === "PENDING" && payment.expiresAt > new Date() ? payment.gatewayUrl : null,
      expiresAt: payment.expiresAt };
  }
}
