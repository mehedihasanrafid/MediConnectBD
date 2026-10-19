/**
 * Named application roles linked to users. Role membership grants broad capabilities; ownership
 * and approved-doctor checks remain separate business rules.
 */

import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../users/user.entity";

@Entity({ name: "roles" })
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  description!: string | null;

  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];
}
