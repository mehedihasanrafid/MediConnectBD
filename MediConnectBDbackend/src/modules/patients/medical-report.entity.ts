/**
 * Patient medical report entity (`medical_reports`). Only the owning patient and doctors who have
 * an appointment relationship with the patient may access the report content; ADMIN is excluded.
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
import { PatientProfile } from "./patient-profile.entity";

@Entity({ name: "medical_reports" })
@Index("idx_medical_reports_patient", ["patientProfileId"])
export class MedicalReport {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "patient_profile_id", type: "char", length: 36 })
  patientProfileId!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ name: "file_name", type: "varchar", length: 255 })
  fileName!: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType!: string;

  @Column({ name: "size_bytes", type: "int", unsigned: true })
  sizeBytes!: number;

  @Column({ name: "content_base64", type: "mediumtext" })
  contentBase64!: string;

  @Column({ type: "varchar", length: 1000, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => PatientProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "patient_profile_id" })
  patientProfile!: PatientProfile;
}
