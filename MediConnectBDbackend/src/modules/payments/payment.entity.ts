/**
 * Payment ledger row with immutable booking/amount references, idempotency data, provider
 * references, and hold expiry. INITIATED may represent a provider request with an uncertain
 * outcome; reconcile it before another checkout attempt.
 */

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Appointment } from "../appointments/appointment.entity";
import type { PaymentStatus } from "./payment.types";

@Entity({ name: "payments" })
@Index("uq_payments_appointment", ["appointmentId"], { unique: true })
@Index("uq_payments_transaction", ["transactionId"], { unique: true })
@Index("uq_payments_patient_key", ["patientProfileId", "idempotencyKey"], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "appointment_id", type: "char", length: 36 }) appointmentId!: string;
  @Column({ name: "patient_profile_id", type: "char", length: 36 }) patientProfileId!: string;
  @Column({ name: "transaction_id", type: "varchar", length: 30 }) transactionId!: string;
  @Column({ name: "idempotency_key", type: "varchar", length: 100 }) idempotencyKey!: string;
  @Column({ name: "request_hash", type: "char", length: 64 }) requestHash!: string;
  @Column({ type: "decimal", precision: 10, scale: 2 }) amount!: string;
  @Column({ type: "char", length: 3, default: "BDT" }) currency!: "BDT";
  @Column({ type: "varchar", length: 30 }) status!: PaymentStatus;
  @Column({ name: "session_id", type: "varchar", length: 100, nullable: true }) sessionId!: string | null;
  @Column({ name: "gateway_url", type: "varchar", length: 1000, nullable: true }) gatewayUrl!: string | null;
  @Column({ name: "validation_id", type: "varchar", length: 100, nullable: true }) validationId!: string | null;
  @Column({ name: "bank_transaction_id", type: "varchar", length: 100, nullable: true }) bankTransactionId!: string | null;
  @Column({ name: "expires_at", type: "datetime", precision: 3 }) expiresAt!: Date;
  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 }) updatedAt!: Date;
  @ManyToOne(() => Appointment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "appointment_id" }) appointment!: Appointment;
}
