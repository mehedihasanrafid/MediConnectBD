import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DoctorProfile } from "./doctor-profile.entity";

@Entity({ name: "specialties" })
export class Specialty {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 140, unique: true })
  slug!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @ManyToMany(() => DoctorProfile, (doctor) => doctor.specialties)
  doctors!: DoctorProfile[];
}
