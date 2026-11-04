/**
 * TypeORM entities for doctor-patient conversations, participants, and entitlements.
 * Linked one-to-one to confirmed/completed appointments.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from "typeorm";
import { Appointment } from "../appointments/appointment.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { FamilyMember } from "../patients/family-member.entity";
import { User } from "../users/user.entity";
import { Message } from "./message.entity";

export enum ConversationStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  BLOCKED = "BLOCKED",
}

@Entity({ name: "conversations" })
@Index("uq_conversations_appointment", ["appointmentId"], { unique: true })
@Index("idx_conversations_doctor", ["doctorProfileId"])
@Index("idx_conversations_patient", ["patientProfileId"])
@Index("idx_conversations_updated", ["updatedAt"])
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "appointment_id", type: "char", length: 36, unique: true })
  appointmentId!: string;

  @Column({ name: "doctor_profile_id", type: "char", length: 36 })
  doctorProfileId!: string;

  @Column({ name: "patient_profile_id", type: "char", length: 36 })
  patientProfileId!: string;

  @Column({ name: "family_member_id", type: "char", length: 36, nullable: true })
  familyMemberId!: string | null;

  @Column({
    type: "enum",
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status!: ConversationStatus;

  @Column({ name: "last_message_at", type: "datetime", precision: 3, nullable: true })
  lastMessageAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @OneToOne(() => Appointment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "appointment_id" })
  appointment!: Appointment;

  @ManyToOne(() => DoctorProfile, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "doctor_profile_id" })
  doctorProfile!: DoctorProfile;

  @ManyToOne(() => PatientProfile, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "patient_profile_id" })
  patientProfile!: PatientProfile;

  @ManyToOne(() => FamilyMember, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "family_member_id" })
  familyMember!: FamilyMember | null;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants!: ConversationParticipant[];

  @OneToMany(() => Message, (m) => m.conversation)
  messages!: Message[];

  @OneToOne(() => CommunicationEntitlement, (e) => e.conversation)
  entitlement!: Relation<CommunicationEntitlement>;
}

@Entity({ name: "conversation_participants" })
@Index("uq_conv_participants_user", ["conversationId", "userId"], { unique: true })
@Index("idx_conv_participants_user", ["userId"])
export class ConversationParticipant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "conversation_id", type: "char", length: 36 })
  conversationId!: string;

  @Column({ name: "user_id", type: "char", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 20 })
  role!: "DOCTOR" | "PATIENT";

  @Column({ name: "last_read_at", type: "datetime", precision: 3, nullable: true })
  lastReadAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => Conversation, (c) => c.participants, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: Conversation;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}

@Entity({ name: "communication_entitlements" })
@Index("uq_comm_entitlements_conv", ["conversationId"], { unique: true })
@Index("idx_comm_entitlements_window", ["windowExpiresAt"])
export class CommunicationEntitlement {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "conversation_id", type: "char", length: 36, unique: true })
  conversationId!: string;

  @Column({ name: "window_starts_at", type: "datetime", precision: 3 })
  windowStartsAt!: Date;

  @Column({ name: "window_expires_at", type: "datetime", precision: 3 })
  windowExpiresAt!: Date;

  @Column({ name: "is_extended", type: "boolean", default: false })
  isExtended!: boolean;

  @Column({ name: "extended_days_total", type: "int", default: 0 })
  extendedDaysTotal!: number;

  @Column({ name: "extension_reason", type: "varchar", length: 500, nullable: true })
  extensionReason!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @OneToOne(() => Conversation, (c) => c.entitlement, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: Conversation;
}
