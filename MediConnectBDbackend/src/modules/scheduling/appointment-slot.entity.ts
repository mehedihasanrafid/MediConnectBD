/**
 * Concrete UTC consultation window and fee snapshot. The unique doctor/start index prevents
 * duplicate generated slots; HELD/BOOKED states must be changed transactionally by booking/payment
 * workflows.
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
import { DoctorChamber } from "../doctors/doctor-chamber.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import { ConsultationMode } from "../appointments/consultation-mode";
import { DoctorSchedule } from "./doctor-schedule.entity";

export enum AppointmentSlotStatus {
  AVAILABLE = "AVAILABLE",
  HELD = "HELD",
  BOOKED = "BOOKED",
  BLOCKED = "BLOCKED",
}

@Entity({ name: "appointment_slots" })
@Index("uq_appointment_slots_doctor_start", ["doctorProfileId", "startAt"], {
  unique: true,
})
@Index("idx_appointment_slots_public_availability", [
  "doctorProfileId",
  "status",
  "startAt",
])
export class AppointmentSlot {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "doctor_profile_id", type: "char", length: 36 })
  doctorProfileId!: string;

  @Column({ name: "schedule_id", type: "char", length: 36, nullable: true })
  scheduleId!: string | null;

  @Column({ name: "chamber_id", type: "char", length: 36, nullable: true })
  chamberId!: string | null;

  @Column({ name: "start_at", type: "datetime", precision: 3 })
  startAt!: Date;

  @Column({ name: "end_at", type: "datetime", precision: 3 })
  endAt!: Date;

  @Column({ type: "enum", enum: ConsultationMode })
  mode!: ConsultationMode;

  @Column({ name: "fee_amount", type: "decimal", precision: 10, scale: 2 })
  feeAmount!: string;

  @Column({ type: "enum", enum: AppointmentSlotStatus, default: AppointmentSlotStatus.AVAILABLE })
  status!: AppointmentSlotStatus;

  @Column({ name: "held_until", type: "datetime", precision: 3, nullable: true })
  heldUntil!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => DoctorProfile, (doctor) => doctor.appointmentSlots, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "doctor_profile_id" })
  doctor!: DoctorProfile;

  @ManyToOne(() => DoctorSchedule, (schedule) => schedule.slots, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "schedule_id" })
  schedule!: DoctorSchedule | null;

  @ManyToOne(() => DoctorChamber, (chamber) => chamber.appointmentSlots, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "chamber_id" })
  chamber!: DoctorChamber | null;
}
