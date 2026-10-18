import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "refresh_sessions" })
@Index("idx_refresh_sessions_user_active", ["userId", "revokedAt", "expiresAt"])
export class RefreshSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "char", length: 36 })
  userId!: string;

  @Column({ name: "token_hash", type: "char", length: 64, unique: true })
  tokenHash!: string;

  @Column({ name: "expires_at", type: "datetime", precision: 3 })
  expiresAt!: Date;

  @Column({ name: "last_used_at", type: "datetime", precision: 3, nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: "revoked_at", type: "datetime", precision: 3, nullable: true })
  revokedAt!: Date | null;

  @Column({ name: "replaced_by_session_id", type: "char", length: 36, nullable: true })
  replacedBySessionId!: string | null;

  @Column({ name: "user_agent", type: "varchar", length: 255, nullable: true })
  userAgent!: string | null;

  @Column({ name: "ip_address", type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
