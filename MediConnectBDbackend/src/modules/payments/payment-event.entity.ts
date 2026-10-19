/**
 * Append-only allowlisted evidence from verified provider results. Fingerprint uniqueness
 * deduplicates repeated callbacks without storing card details, raw callback bodies, or
 * credentials.
 */

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Payment } from "./payment.entity";

/**
 * Allowlisted verification evidence only: never store card details or raw callbacks.
 */
@Entity({ name: "payment_events" })
@Index("uq_payment_events_fingerprint", ["paymentId", "fingerprint"], { unique: true })
export class PaymentEvent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "payment_id", type: "char", length: 36 }) paymentId!: string;
  @Column({ type: "char", length: 64 }) fingerprint!: string;
  @Column({ name: "provider_status", type: "varchar", length: 30 }) providerStatus!: string;
  @Column({ name: "risk_level", type: "varchar", length: 10 }) riskLevel!: string;
  @Column({ name: "validation_id", type: "varchar", length: 100, nullable: true }) validationId!: string | null;
  @Column({ type: "decimal", precision: 10, scale: 2 }) amount!: string;
  @Column({ type: "char", length: 3 }) currency!: string;
  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 }) createdAt!: Date;
  @ManyToOne(() => Payment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "payment_id" }) payment!: Payment;
}
