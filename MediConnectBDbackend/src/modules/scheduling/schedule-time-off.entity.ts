/**
 * A doctor's local-date availability exception. Null start/end times represent a full day;
 * otherwise both times define a partial-day blocking interval.
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
import { DoctorProfile } from "../doctors/doctor-profile.entity";

@Entity({ name: "schedule_time_off" })
@Index("idx_schedule_time_off_doctor_date", ["doctorProfileId", "date"])
export class ScheduleTimeOff {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "doctor_profile_id", type: "char", length: 36 })
  doctorProfileId!: string;

  @Column({ type: "date" })
  date!: string;

  @Column({ name: "start_time", type: "time", nullable: true })
  startTime!: string | null;

  @Column({ name: "end_time", type: "time", nullable: true })
  endTime!: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => DoctorProfile, (doctor) => doctor.timeOff, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_profile_id" })
  doctor!: DoctorProfile;
}
