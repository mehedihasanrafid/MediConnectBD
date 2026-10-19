/**
 * Account identity and status with password hash and role relations. Account data is shared by
 * patient/doctor profiles; public responses must explicitly omit passwordHash.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { Role } from "../role/role.entity";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
  SUSPENDED = "SUSPENDED",
}

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191, unique: true })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ name: "first_name", type: "varchar", length: 80 })
  firstName!: string;

  @Column({ name: "last_name", type: "varchar", length: 80 })
  lastName!: string;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.PENDING })
  status!: UserStatus;

  @Column({ name: "email_verified_at", type: "datetime", precision: 3, nullable: true })
  emailVerifiedAt!: Date | null;

  @VersionColumn({ type: "int", unsigned: true })
  version!: number;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles!: Role[];

  @OneToOne(() => PatientProfile, (profile) => profile.user)
  patientProfile!: PatientProfile | null;

  @OneToOne(() => DoctorProfile, (profile) => profile.user)
  doctorProfile!: DoctorProfile | null;
}
