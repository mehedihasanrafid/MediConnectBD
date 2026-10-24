/**
 * Adds the global status/expiry access path used by the bounded background hold cleanup. The
 * earlier slot-first index remains useful for per-slot booking transactions.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddHoldExpiryIndex1761307200000 implements MigrationInterface {
  name = "AddHoldExpiryIndex1761307200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE INDEX idx_slot_holds_status_expiry ON slot_holds(status, expires_at)",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DROP INDEX idx_slot_holds_status_expiry ON slot_holds",
    );
  }
}
