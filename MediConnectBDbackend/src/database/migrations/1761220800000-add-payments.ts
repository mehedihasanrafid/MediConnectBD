/**
 * Schema history: 1761220800000-add-payments.ts. Apply through the registered TypeORM migration
 * sequence; do not rewrite an already applied migration. The up/down order follows foreign-key
 * dependencies, and a down migration can remove schema/data subject to its explicit guards.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPayments1761220800000 implements MigrationInterface {
  name = "AddPayments1761220800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE payments (
      id char(36) NOT NULL PRIMARY KEY,
      appointment_id char(36) NOT NULL,
      patient_profile_id char(36) NOT NULL,
      transaction_id varchar(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      idempotency_key varchar(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      request_hash char(64) NOT NULL,
      amount decimal(10,2) NOT NULL,
      currency char(3) NOT NULL DEFAULT 'BDT',
      status varchar(30) NOT NULL,
      session_id varchar(100) NULL,
      gateway_url varchar(1000) NULL,
      validation_id varchar(100) NULL,
      bank_transaction_id varchar(100) NULL,
      expires_at datetime(3) NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_payments_appointment (appointment_id),
      UNIQUE KEY uq_payments_transaction (transaction_id),
      UNIQUE KEY uq_payments_patient_key (patient_profile_id, idempotency_key),
      KEY idx_payments_status_expiry (status, expires_at),
      CONSTRAINT fk_payments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
      CONSTRAINT fk_payments_patient FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
      CONSTRAINT chk_payments_amount CHECK (amount > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE payment_events (
      id char(36) NOT NULL PRIMARY KEY,
      payment_id char(36) NOT NULL,
      fingerprint char(64) NOT NULL,
      provider_status varchar(30) NOT NULL,
      risk_level varchar(10) NOT NULL,
      validation_id varchar(100) NULL,
      amount decimal(10,2) NOT NULL,
      currency char(3) NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_payment_events_fingerprint (payment_id, fingerprint),
      CONSTRAINT fk_payment_events_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE refunds (
      id char(36) NOT NULL PRIMARY KEY,
      payment_id char(36) NOT NULL,
      refund_transaction_id varchar(30) NOT NULL,
      amount decimal(10,2) NOT NULL,
      status varchar(30) NOT NULL DEFAULT 'REQUESTED',
      reason varchar(500) NOT NULL,
      provider_reference varchar(100) NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_refunds_transaction (refund_transaction_id),
      CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
      CONSTRAINT chk_refunds_amount CHECK (amount > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Refuse a rollback that would delete financial history.
    const rows: Array<{ count: string }> = await queryRunner.query("SELECT COUNT(*) AS count FROM payments");
    if (Number(rows[0]?.count) > 0) throw new Error("Cannot drop payment tables containing financial records");
    await queryRunner.query("DROP TABLE refunds");
    await queryRunner.query("DROP TABLE payment_events");
    await queryRunner.query("DROP TABLE payments");
  }
}
