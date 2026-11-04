import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../users/user.entity";

export type DirectKind = "SUPPORT" | "COLLEAGUE" | "STAFF";
@Entity({ name: "direct_conversations" })
@Index("uq_direct_conversation_key", ["key"], { unique: true })
@Index("idx_direct_member_a", ["memberAId"])
@Index("idx_direct_member_b", ["memberBId"])
export class DirectConversation {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "conversation_key", type: "varchar", length: 100 }) key!: string;
  @Column({ type: "varchar", length: 16 }) kind!: DirectKind;
  @Column({ name: "member_a_id", type: "char", length: 36 }) memberAId!: string;
  @Column({ name: "member_b_id", type: "char", length: 36 }) memberBId!: string;
  @Column({ name: "a_read_at", type: "datetime", precision: 3, nullable: true }) aReadAt!: Date | null;
  @Column({ name: "b_read_at", type: "datetime", precision: 3, nullable: true }) bReadAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 }) updatedAt!: Date;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "member_a_id" }) memberA!: User;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "member_b_id" }) memberB!: User;
}
@Entity({ name: "direct_messages" })
@Index("idx_direct_messages_history", ["conversationId", "createdAt", "id"])
@Index("uq_direct_message_key", ["conversationId", "senderId", "idempotencyKey"], { unique: true })
export class DirectMessage {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "conversation_id", type: "char", length: 36 }) conversationId!: string;
  @Column({ name: "sender_id", type: "char", length: 36 }) senderId!: string;
  @Column({ name: "sender_role", type: "varchar", length: 20 }) senderRole!: "PATIENT" | "DOCTOR" | "ADMIN";
  @Column({ name: "sender_name", type: "varchar", length: 180 }) senderName!: string;
  @Column({ type: "text" }) content!: string;
  @Column({ name: "idempotency_key", type: "varchar", length: 128, nullable: true }) idempotencyKey!: string | null;
  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 }) createdAt!: Date;
  @ManyToOne(() => DirectConversation, { onDelete: "RESTRICT" }) @JoinColumn({ name: "conversation_id" }) conversation!: DirectConversation;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "sender_id" }) sender!: User;
}
