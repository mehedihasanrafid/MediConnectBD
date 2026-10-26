/**
 * Durable booking with historical time/mode/fee snapshots. A unique hold link supports eligible
 * retries. PENDING_PAYMENT is not a confirmed video consultation; only verified payment may
 * confirm it.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AppointmentSlot } from "../scheduling/appointment-slot.entity";
import { ConsultationMode } from "./consultation-mode";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { SlotHold } from "./slot-hold.entity";

export enum AppointmentStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  PAYMENT_EXPIRED = "PAYMENT_EXPIRED",
  COMPLETED = "COMPLETED",
  NO_SHOW = "NO_SHOW",
}

@Entity({ name: "appointments" })
@Index("uq_appointments_hold", ["holdId"], { unique: true })
@Index("idx_appointments_slot", ["slotId"])
@Index("idx_appointments_patient_start", ["patientProfileId", "scheduledStartAt"])
@Index("idx_appointments_doctor_start", ["doctorProfileId", "scheduledStartAt"])
@Index("idx_appointments_status", ["status"])
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "slot_id", type: "char", length: 36 })
  slotId!: string;

  @Column({ name: "hold_id", type: "char", length: 36, unique: true })
  holdId!: string;

  @Column({ name: "patient_profile_id", type: "char", length: 36 })
  patientProfileId!: string;

  @Column({ name: "doctor_profile_id", type: "char", length: 36 })
  doctorProfileId!: string;

  @Column({ name: "scheduled_start_at", type: "datetime", precision: 3 })
  scheduledStartAt!: Date;

  @Column({ name: "scheduled_end_at", type: "datetime", precision: 3 })
  scheduledEndAt!: Date;

  @Column({ type: "enum", enum: ConsultationMode })
  mode!: ConsultationMode;

  @Column({ name: "fee_amount", type: "decimal", precision: 10, scale: 2 })
  feeAmount!: string;

  @Column({ type: "enum", enum: AppointmentStatus })
  status!: AppointmentStatus;

  @Column({ name: "payment_reference", type: "varchar", length: 191, nullable: true })
  paymentReference!: string | null;

  @Column({ name: "cancellation_reason", type: "varchar", length: 500, nullable: true })
  cancellationReason!: string | null;

  @Column({ name: "reminder_24h_sent", type: "boolean", default: false })
  reminder24hSent!: boolean;

  @Column({ name: "reminder_30min_sent", type: "boolean", default: false })
  reminder30minSent!: boolean;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => AppointmentSlot, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "slot_id" })
  slot!: AppointmentSlot;

  @ManyToOne(() => SlotHold, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "hold_id" })
  hold!: SlotHold;

  @ManyToOne(() => PatientProfile, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "patient_profile_id" })
  patientProfile!: PatientProfile;

  @ManyToOne(() => DoctorProfile, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "doctor_profile_id" })
  doctor!: DoctorProfile;
}
