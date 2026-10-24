/**
 * Short-lived ownership of one appointment slot by a patient. Expiry releases availability;
 * CONVERTED preserves the link to the durable booking rather than deleting reservation history.
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
import { PatientProfile } from "../patients/patient-profile.entity";

export enum SlotHoldStatus {
  ACTIVE = "ACTIVE",
  CONVERTED = "CONVERTED",
  EXPIRED = "EXPIRED",
  RELEASED = "RELEASED",
}

@Entity({ name: "slot_holds" })
@Index("idx_slot_holds_slot_status_expiry", ["slotId", "status", "expiresAt"])
@Index("idx_slot_holds_patient_status", ["patientProfileId", "status"])
@Index("idx_slot_holds_status_expiry", ["status", "expiresAt"])
export class SlotHold {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "slot_id", type: "char", length: 36 })
  slotId!: string;

  @Column({ name: "patient_profile_id", type: "char", length: 36 })
  patientProfileId!: string;

  @Column({ type: "enum", enum: SlotHoldStatus, default: SlotHoldStatus.ACTIVE })
  status!: SlotHoldStatus;

  @Column({ name: "expires_at", type: "datetime", precision: 3 })
  expiresAt!: Date;

  @Column({ name: "released_at", type: "datetime", precision: 3, nullable: true })
  releasedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => AppointmentSlot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "slot_id" })
  slot!: AppointmentSlot;

  @ManyToOne(() => PatientProfile, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "patient_profile_id" })
  patientProfile!: PatientProfile;
}
