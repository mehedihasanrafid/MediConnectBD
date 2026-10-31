/**
 * In-app notification entity (`in_app_notifications`) for patients, doctors, and admins.
 * Stores auditable clinical, payment, communication, and appointment notices with
 * exact Asia/Dhaka timestamps and context-aware action routes.
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

export type InAppNotificationType =
  | "PRESCRIPTION"
  | "PAYMENT"
  | "COMMUNICATION"
  | "CALL"
  | "APPOINTMENT"
  | "SYSTEM";

export type InAppNotificationPriority = "info" | "success" | "warning" | "urgent";

@Entity({ name: "in_app_notifications" })
@Index("idx_notifications_user_read", ["userId", "isRead"])
@Index("idx_notifications_user_created", ["userId", "createdAt"])
export class InAppNotification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "char", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 30, default: "ALL" })
  role!: string;

  @Column({ type: "varchar", length: 40 })
  type!: InAppNotificationType;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "text", nullable: true })
  details!: string | null;

  @Column({ type: "varchar", length: 20, default: "info" })
  priority!: InAppNotificationPriority;

  @Column({ name: "is_read", type: "boolean", default: false })
  isRead!: boolean;

  @Column({ name: "read_at", type: "datetime", precision: 3, nullable: true })
  readAt!: Date | null;

  @Column({ name: "action_url", type: "varchar", length: 255, default: "/" })
  actionUrl!: string;

  @Column({ name: "action_label", type: "varchar", length: 100, default: "View" })
  actionLabel!: string;

  @Column({ name: "secondary_action_url", type: "varchar", length: 255, nullable: true })
  secondaryActionUrl!: string | null;

  @Column({ name: "secondary_action_label", type: "varchar", length: 100, nullable: true })
  secondaryActionLabel!: string | null;

  @Column({ type: "simple-json", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;
}
