import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../users/user.entity";

export type CallStatus = "RINGING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "MISSED" | "ENDED";
export type CallMedia = "AUDIO" | "VIDEO";
@Entity({ name: "communication_calls" })
@Index("idx_calls_caller", ["callerId", "createdAt"])
@Index("idx_calls_callee", ["calleeId", "createdAt"])
@Index("uq_calls_request", ["callerId", "idempotencyKey"], { unique: true })
export class CommunicationCall {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "conversation_ref", type: "varchar", length: 64 }) conversationRef!: string;
  @Column({ name: "caller_id", type: "char", length: 36 }) callerId!: string;
  @Column({ name: "callee_id", type: "char", length: 36 }) calleeId!: string;
  @Column({ type: "varchar", length: 8 }) media!: CallMedia;
  @Column({ type: "varchar", length: 12 }) status!: CallStatus;
  @Column({ name: "idempotency_key", type: "char", length: 36 }) idempotencyKey!: string;
  @Column({ name: "expires_at", type: "datetime", precision: 3 }) expiresAt!: Date;
  @Column({ name: "answered_at", type: "datetime", precision: 3, nullable: true }) answeredAt!: Date | null;
  @Column({ name: "ended_at", type: "datetime", precision: 3, nullable: true }) endedAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 }) createdAt!: Date;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "caller_id" }) caller!: User;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "callee_id" }) callee!: User;
}
