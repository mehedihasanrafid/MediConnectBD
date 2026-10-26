/**
 * Payment ledger and booking-state transaction boundary. One payment per appointment plus
 * patient/idempotency-key uniqueness prevents duplicate checkout records. Verified events and
 * eligible booking transitions commit together.
 */

import { createHash, randomBytes } from "node:crypto";
import { LessThanOrEqual, type DataSource } from "typeorm";
import { AppError } from "../../utils/app-error";
import { Appointment, AppointmentStatus } from "../appointments/appointment.entity";
import { AppointmentSlot, AppointmentSlotStatus } from "../scheduling/appointment-slot.entity";
import { ConsultationMode } from "../appointments/consultation-mode";
import { Payment } from "./payment.entity";
import { PaymentEvent } from "./payment-event.entity";
import { SlotHold, SlotHoldStatus } from "../appointments/slot-hold.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import type { NotificationService } from "../notifications/notification-service";
import type { PaymentRepository } from "./payment.repository";
import {
  decimalAmount,
  splitCommission,
  type PaymentView,
  type UnpaidHoldExpirationSummary,
  type VerifiedTransaction,
} from "./payment.types";

export class TypeOrmPaymentRepository implements PaymentRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationService?: NotificationService | null,
  ) {}

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
    let newlyConfirmedAppointment: Appointment | null = null;
    const view = await this.dataSource.transaction(async (manager) => {
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
          // Commission is derived from the server-verified amount, never a client value.
          const split = splitCommission(payment.amount);
          payment.commissionAmount = split.commissionAmount;
          payment.netAmount = split.netAmount;
          appointment.status = AppointmentStatus.CONFIRMED;
          appointment.paymentReference = payment.transactionId;
          hold.status = SlotHoldStatus.CONVERTED;
          hold.releasedAt = now;
          slot.status = AppointmentSlotStatus.BOOKED;
          slot.heldUntil = null;
          await appointments.save(appointment);
          await holds.save(hold);
          await slots.save(slot);
          newlyConfirmedAppointment = appointment;
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

    if (newlyConfirmedAppointment && this.notificationService) {
      const confirmed: Appointment = newlyConfirmedAppointment;
      await this.notifyVideoConfirmation(confirmed).catch((error: unknown) => {
        console.error({ error }, "Failed to send video booking confirmation email");
      });
    }

    return view;
  }

  private async notifyVideoConfirmation(appointment: Appointment): Promise<void> {
    if (!this.notificationService) return;
    const [patient, doctor] = await Promise.all([
      this.dataSource.getRepository(PatientProfile).findOne({
        where: { id: appointment.patientProfileId },
        relations: { user: true },
      }),
      this.dataSource.getRepository(DoctorProfile).findOne({
        where: { id: appointment.doctorProfileId },
        relations: { user: true },
      }),
    ]);
    if (!patient?.user?.email || !doctor?.user) return;
    const doctorName = `${doctor.user.firstName} ${doctor.user.lastName}`.trim();
    await this.notificationService.sendBookingConfirmation(
      patient.user.email,
      appointment.id,
      doctorName,
      appointment.scheduledStartAt,
      Number(appointment.feeAmount),
    );
  }

  /**
   * Expires only rows that are still unconfirmed after locks are acquired. Candidate selection is
   * intentionally outside the per-hold transaction: each transaction stays short, and stale
   * candidates are harmless because their current state is checked again under row locks.
   */
  async expireUnpaidHolds(now: Date, limit: number): Promise<UnpaidHoldExpirationSummary> {
    const candidates = await this.dataSource.getRepository(SlotHold).find({
      select: { id: true },
      where: {
        status: SlotHoldStatus.ACTIVE,
        expiresAt: LessThanOrEqual(now),
      },
      order: { expiresAt: "ASC", id: "ASC" },
      take: limit,
    });

    const summary: UnpaidHoldExpirationSummary = {
      candidates: candidates.length,
      expired: 0,
      protected: 0,
      skipped: 0,
    };

    for (const candidate of candidates) {
      const outcome = await this.dataSource.transaction(async (manager) => {
        const holds = manager.getRepository(SlotHold);
        const hold = await holds.findOne({
          where: { id: candidate.id },
          lock: { mode: "pessimistic_write" },
        });
        if (!hold || hold.status !== SlotHoldStatus.ACTIVE || hold.expiresAt > now) {
          return "SKIPPED" as const;
        }

        const slots = manager.getRepository(AppointmentSlot);
        const slot = await slots.findOne({
          where: { id: hold.slotId },
          lock: { mode: "pessimistic_write" },
        });
        if (!slot) return "SKIPPED" as const;

        const appointments = manager.getRepository(Appointment);
        const appointment = await appointments.findOne({
          where: { holdId: hold.id },
          lock: { mode: "pessimistic_write" },
        });
        const payments = manager.getRepository(Payment);
        const payment = appointment
          ? await payments.findOne({
              where: { appointmentId: appointment.id },
              lock: { mode: "pessimistic_write" },
            })
          : null;

        // A succeeded charge and a confirmed appointment are both terminal safety barriers.
        if (
          appointment?.status === AppointmentStatus.CONFIRMED ||
          payment?.status === "SUCCEEDED"
        ) {
          return "PROTECTED" as const;
        }

        if (appointment?.status === AppointmentStatus.PENDING_PAYMENT) {
          appointment.status = AppointmentStatus.PAYMENT_EXPIRED;
          appointment.cancellationReason = "Payment hold expired";
          await appointments.save(appointment);
        }
        if (payment?.status === "INITIATED" || payment?.status === "PENDING") {
          payment.status = "EXPIRED";
          await payments.save(payment);
        }

        hold.status = SlotHoldStatus.EXPIRED;
        hold.releasedAt = now;
        await holds.save(hold);

        // A later reservation may already occupy the slot. Only release this hold's exact window.
        if (
          slot.status === AppointmentSlotStatus.HELD &&
          slot.heldUntil?.getTime() === hold.expiresAt.getTime()
        ) {
          slot.status = AppointmentSlotStatus.AVAILABLE;
          slot.heldUntil = null;
          await slots.save(slot);
        }
        return "EXPIRED" as const;
      });

      if (outcome === "EXPIRED") summary.expired += 1;
      else if (outcome === "PROTECTED") summary.protected += 1;
      else summary.skipped += 1;
    }

    return summary;
  }

  /**
   * Exposes a checkout URL only for an unexpired PENDING payment; hiding it does not itself expire
   * database state.
   */
  private view(payment: Payment): PaymentView {
    return { id: payment.id, appointmentId: payment.appointmentId, patientProfileId: payment.patientProfileId,
      transactionId: payment.transactionId, amount: payment.amount, currency: payment.currency,
      commissionAmount: payment.commissionAmount, netAmount: payment.netAmount,
      status: payment.status, gatewayUrl: payment.status === "PENDING" && payment.expiresAt > new Date() ? payment.gatewayUrl : null,
      expiresAt: payment.expiresAt };
  }
}
