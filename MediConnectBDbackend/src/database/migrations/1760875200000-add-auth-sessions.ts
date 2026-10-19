/**
 * Schema history: 1760875200000-add-auth-sessions.ts. Apply through the registered TypeORM
 * migration sequence; do not rewrite an already applied migration. The up/down order follows
 * foreign-key dependencies, and a down migration can remove schema/data subject to its explicit
 * guards.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthSessions1760875200000 implements MigrationInterface {
  name = "AddAuthSessions1760875200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT IGNORE INTO roles (id, name, description) VALUES
        (UUID(), 'PATIENT', 'Books and attends healthcare appointments'),
        (UUID(), 'DOCTOR', 'Provides approved healthcare consultations'),
        (UUID(), 'ADMIN', 'Manages operational platform data')
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_sessions (
        id char(36) NOT NULL,
        user_id char(36) NOT NULL,
        token_hash char(64) NOT NULL,
        expires_at datetime(3) NOT NULL,
        last_used_at datetime(3) NULL,
        revoked_at datetime(3) NULL,
        replaced_by_session_id char(36) NULL,
        user_agent varchar(255) NULL,
        ip_address varchar(45) NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_refresh_sessions PRIMARY KEY (id),
        CONSTRAINT uq_refresh_sessions_token_hash UNIQUE (token_hash),
        CONSTRAINT fk_refresh_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      "CREATE INDEX idx_refresh_sessions_user_active ON refresh_sessions(user_id, revoked_at, expires_at)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE refresh_sessions");
  }
}
