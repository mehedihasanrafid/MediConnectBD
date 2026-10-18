import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Specialty } from "./specialty.entity";
import { User } from "./user.entity";

export enum DoctorApplicationStatus {
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

@Entity({ name: "doctor_profiles" })
export class DoctorProfile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "char", length: 36, unique: true })
  userId!: string;

  @Column({ name: "bmdc_number", type: "varchar", length: 64, unique: true })
  bmdcNumber!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  degrees!: string | null;

  @Column({ name: "experience_years", type: "smallint", unsigned: true, default: 0 })
  experienceYears!: number;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({
    name: "application_status",
    type: "enum",
    enum: DoctorApplicationStatus,
    default: DoctorApplicationStatus.DRAFT,
  })
  applicationStatus!: DoctorApplicationStatus;

  @Column({ name: "reviewed_at", type: "datetime", precision: 3, nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: "rejection_reason", type: "varchar", length: 500, nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @OneToOne(() => User, (user) => user.doctorProfile, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToMany(() => Specialty, (specialty) => specialty.doctors)
  specialties!: Specialty[];
}
