/**
 * A doctor's practice at a catalog hospital, including room and consultation fee. Generated slots
 * refer to this relationship, not directly to the hospital catalog ID.
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
  OneToMany,
} from "typeorm";
import { DoctorProfile } from "./doctor-profile.entity";
import { Hospital } from "../hospitals/hospital.entity";
import { DoctorSchedule } from "../scheduling/doctor-schedule.entity";
import { AppointmentSlot } from "../scheduling/appointment-slot.entity";

@Entity({ name: "doctor_chambers" })
@Index("uq_doctor_chambers_doctor_hospital", ["doctorProfileId", "hospitalId"], {
  unique: true,
})
@Index("idx_doctor_chambers_hospital_active_fee", [
  "hospitalId",
  "isActive",
  "consultationFee",
])
export class DoctorChamber {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "doctor_profile_id", type: "char", length: 36 })
  doctorProfileId!: string;

  @Column({ name: "hospital_id", type: "char", length: 36 })
  hospitalId!: string;

  @Column({ name: "room_or_unit", type: "varchar", length: 120, nullable: true })
  roomOrUnit!: string | null;

  @Column({ name: "consultation_fee", type: "decimal", precision: 10, scale: 2 })
  consultationFee!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => DoctorProfile, (doctor) => doctor.chambers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_profile_id" })
  doctor!: DoctorProfile;

  @ManyToOne(() => Hospital, (hospital) => hospital.doctorChambers, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "hospital_id" })
  hospital!: Hospital;

  @OneToMany(() => DoctorSchedule, (schedule) => schedule.chamber)
  schedules!: DoctorSchedule[];

  @OneToMany(() => AppointmentSlot, (slot) => slot.chamber)
  appointmentSlots!: AppointmentSlot[];
}
