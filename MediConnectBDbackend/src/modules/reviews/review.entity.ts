/**
 * Patient review of a doctor after a completed appointment. One review per completed
 * appointment; admin can remove reviews via DELETE /admin/reviews/:id.
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
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { Appointment } from "../appointments/appointment.entity";

@Entity({ name: "reviews" })
@Index("uq_reviews_appointment", ["appointmentId"], { unique: true })
@Index("idx_reviews_doctor", ["doctorProfileId"])
@Index("idx_reviews_patient", ["patientProfileId"])
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "appointment_id", type: "char", length: 36 })
  appointmentId!: string;

  @Column({ name: "patient_profile_id", type: "char", length: 36 })
  patientProfileId!: string;

  @Column({ name: "doctor_profile_id", type: "char", length: 36 })
  doctorProfileId!: string;

  @Column({ type: "tinyint", unsigned: true })
  rating!: number; // 1-5

  @Column({ name: "comment", type: "text", nullable: true })
  comment!: string | null;

  @Column({ name: "is_visible", type: "boolean", default: true })
  isVisible!: boolean;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => Appointment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "appointment_id" })
  appointment!: Appointment;

  @ManyToOne(() => PatientProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "patient_profile_id" })
  patientProfile!: PatientProfile;

  @ManyToOne(() => DoctorProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_profile_id" })
  doctorProfile!: DoctorProfile;
}
