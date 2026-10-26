/**
 * Patient prescription issued by a doctor after an appointment. Doctor can edit within 24h;
 * unique verification code allows patients/providers to verify authenticity.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Appointment } from "../appointments/appointment.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import { PatientProfile } from "../patients/patient-profile.entity";

@Entity({ name: "prescriptions" })
@Index("uq_prescriptions_appointment", ["appointmentId"], { unique: true })
@Index("idx_prescriptions_doctor", ["doctorProfileId"])
@Index("idx_prescriptions_patient", ["patientProfileId"])
export class Prescription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "appointment_id", type: "char", length: 36 })
  appointmentId!: string;

  @Column({ name: "patient_profile_id", type: "char", length: 36 })
  patientProfileId!: string;

  @Column({ name: "doctor_profile_id", type: "char", length: 36 })
  doctorProfileId!: string;

  @Column({ name: "diagnosis", type: "text" })
  diagnosis!: string;

  @Column({ name: "medicines", type: "json" }) // Array of { name, dosage, frequency, duration }
  medicines!: Array<{ name: string; dosage: string; frequency: string; duration: string }>;

  @Column({ name: "tests", type: "json" }) // Array of test names
  tests!: string[];

  @Column({ name: "advice", type: "text", nullable: true })
  advice!: string | null;

  @Column({ name: "verification_code", type: "char", length: 16, unique: true })
  verificationCode!: string;

  @Column({ name: "is_editable", type: "boolean", default: true })
  isEditable!: boolean;

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

  @OneToMany(() => PrescriptionVersion, (version) => version.prescription, { cascade: true })
  versions!: PrescriptionVersion[];
}

@Entity({ name: "prescription_versions" })
@Index("idx_prescription_versions_prescription", ["prescriptionId"])
export class PrescriptionVersion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "prescription_id", type: "char", length: 36 })
  prescriptionId!: string;

  @Column({ name: "diagnosis", type: "text" })
  diagnosis!: string;

  @Column({ name: "medicines", type: "json" })
  medicines!: Array<{ name: string; dosage: string; frequency: string; duration: string }>;

  @Column({ name: "tests", type: "json" })
  tests!: string[];

  @Column({ name: "advice", type: "text", nullable: true })
  advice!: string | null;

  @Column({ name: "edited_by", type: "char", length: 36 })
  editedBy!: string;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => Prescription, (prescription) => prescription.versions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "prescription_id" })
  prescription!: Prescription;
}
