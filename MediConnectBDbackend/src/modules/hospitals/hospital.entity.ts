/**
 * Hospital/location catalog used by doctor chambers and directory filters. Catalog addresses are
 * public operational data, not patient medical records.
 */

import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DoctorChamber } from "../doctors/doctor-chamber.entity";

@Entity({ name: "hospitals" })
@Index("idx_hospitals_area_active", ["area", "isActive"])
export class Hospital {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 180 })
  name!: string;

  @Column({ type: "varchar", length: 200, unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 120 })
  area!: string;

  @Column({ type: "varchar", length: 500 })
  address!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @OneToMany(() => DoctorChamber, (chamber) => chamber.hospital)
  doctorChambers!: DoctorChamber[];
}
