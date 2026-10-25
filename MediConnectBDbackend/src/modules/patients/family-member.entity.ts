/**
 * Patient-owned profile for booking on behalf of relatives. Linked one-to-one to a patient
 * profile; only the owning patient can manage these records.
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
import { PatientProfile } from "./patient-profile.entity";

@Entity({ name: "family_members" })
@Index("idx_family_members_patient", ["patientProfileId"])
export class FamilyMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "patient_profile_id", type: "char", length: 36 })
  patientProfileId!: string;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 40 })
  relationship!: string;

  @Column({ name: "date_of_birth", type: "date", nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  phone!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => PatientProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "patient_profile_id" })
  patientProfile!: PatientProfile;
}
