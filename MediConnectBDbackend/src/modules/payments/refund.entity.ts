/**
 * Refund persistence foundation linked to a payment. Creating this row alone never performs a
 * provider refund; execution, reconciliation, and operational approval remain future features.
 */

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Payment } from "./payment.entity";

/**
 * Persistence foundation only; provider refund execution is a later milestone.
 */
@Entity({ name: "refunds" })
export class Refund {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "payment_id", type: "char", length: 36 }) paymentId!: string;
  @Column({ name: "refund_transaction_id", type: "varchar", length: 30, unique: true }) refundTransactionId!: string;
  @Column({ type: "decimal", precision: 10, scale: 2 }) amount!: string;
  @Column({ type: "varchar", length: 30, default: "REQUESTED" }) status!: string;
  @Column({ type: "varchar", length: 500 }) reason!: string;
  @Column({ name: "provider_reference", type: "varchar", length: 100, nullable: true }) providerReference!: string | null;
  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 }) updatedAt!: Date;
  @ManyToOne(() => Payment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "payment_id" }) payment!: Payment;
}
