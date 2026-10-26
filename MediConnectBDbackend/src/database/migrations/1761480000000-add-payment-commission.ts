import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds platform commission and doctor net columns to the payment ledger. Both are nullable so
 * existing rows and unverified payments keep NULL until a payment is verified.
 */
export class AddPaymentCommission1761480000000 implements MigrationInterface {
  name = "AddPaymentCommission1761480000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
        ADD COLUMN commission_amount decimal(10,2) NULL,
        ADD COLUMN net_amount decimal(10,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
        DROP COLUMN net_amount,
        DROP COLUMN commission_amount
    `);
  }
}
