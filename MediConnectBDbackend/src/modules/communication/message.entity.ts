/**
 * TypeORM entity for persistent consultation messages.
 * Stores message body, sender identity, and idempotency key for deduplication.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Conversation } from "./conversation.entity";

@Entity({ name: "messages" })
@Index("idx_messages_conversation_created", ["conversationId", "createdAt"])
@Index("uq_messages_sender_key", ["conversationId", "senderId", "idempotencyKey"], { unique: true })
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "conversation_id", type: "char", length: 36 })
  conversationId!: string;

  @Column({ name: "sender_id", type: "char", length: 36 })
  senderId!: string;

  @Column({ name: "sender_role", type: "varchar", length: 20 })
  senderRole!: "DOCTOR" | "PATIENT";

  @Column({ name: "sender_name", type: "varchar", length: 150 })
  senderName!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ name: "idempotency_key", type: "varchar", length: 128, nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: Conversation;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "sender_id" })
  sender!: User;
}
