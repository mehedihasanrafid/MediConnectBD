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
import { AppointmentSlot } from "./appointment-slot.entity";
import { DoctorChamber } from "./doctor-chamber.entity";
import { DoctorProfile } from "./doctor-profile.entity";
import { ConsultationMode } from "./consultation-mode";

@Entity({ name: "doctor_schedules" })
@Index("idx_doctor_schedules_doctor_day_active", ["doctorProfileId", "dayOfWeek", "isActive"])
export class DoctorSchedule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "doctor_profile_id", type: "char", length: 36 })
  doctorProfileId!: string;

  @Column({ name: "day_of_week", type: "tinyint", unsigned: true })
  dayOfWeek!: number;

  @Column({ name: "start_time", type: "time" })
  startTime!: string;

  @Column({ name: "end_time", type: "time" })
  endTime!: string;

  @Column({ name: "slot_duration_minutes", type: "smallint", unsigned: true })
  slotDurationMinutes!: number;

  @Column({ type: "enum", enum: ConsultationMode })
  mode!: ConsultationMode;

  @Column({ name: "chamber_id", type: "char", length: 36, nullable: true })
  chamberId!: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => DoctorProfile, (doctor) => doctor.schedules, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_profile_id" })
  doctor!: DoctorProfile;

  @ManyToOne(() => DoctorChamber, (chamber) => chamber.schedules, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "chamber_id" })
  chamber!: DoctorChamber | null;

  @OneToMany(() => AppointmentSlot, (slot) => slot.schedule)
  slots!: AppointmentSlot[];
}
