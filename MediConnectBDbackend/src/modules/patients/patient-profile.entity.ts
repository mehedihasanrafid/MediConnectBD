/**
 * Patient-specific profile linked one-to-one to a user. Appointments and payment ownership refer
 * to this profile ID, which is different from the account user ID.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../users/user.entity";

export enum BiologicalSex {
  FEMALE = "FEMALE",
  MALE = "MALE",
  OTHER = "OTHER",
  UNDISCLOSED = "UNDISCLOSED",
}

@Entity({ name: "patient_profiles" })
export class PatientProfile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "char", length: 36, unique: true })
  userId!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  phone!: string | null;

  @Column({ name: "date_of_birth", type: "date", nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: "enum", enum: BiologicalSex, default: BiologicalSex.UNDISCLOSED })
  sex!: BiologicalSex;

  @Column({ type: "varchar", length: 500, nullable: true })
  address!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @OneToOne(() => User, (user) => user.patientProfile, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
