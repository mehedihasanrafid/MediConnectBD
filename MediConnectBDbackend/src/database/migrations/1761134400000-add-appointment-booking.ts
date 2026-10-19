/**
 * Schema history: 1761134400000-add-appointment-booking.ts. Apply through the registered TypeORM
 * migration sequence; do not rewrite an already applied migration. The up/down order follows
 * foreign-key dependencies, and a down migration can remove schema/data subject to its explicit
 * guards.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentBooking1761134400000 implements MigrationInterface {
  name = "AddAppointmentBooking1761134400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE appointment_slots ADD COLUMN held_until datetime(3) NULL AFTER status",
    );
    await queryRunner.query(
      "CREATE INDEX idx_appointment_slots_hold_expiry ON appointment_slots(status, held_until)",
    );

    await queryRunner.query(`
      CREATE TABLE slot_holds (
        id char(36) NOT NULL,
        slot_id char(36) NOT NULL,
        patient_profile_id char(36) NOT NULL,
        status enum('ACTIVE', 'CONVERTED', 'EXPIRED', 'RELEASED') NOT NULL DEFAULT 'ACTIVE',
        expires_at datetime(3) NOT NULL,
        released_at datetime(3) NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_slot_holds PRIMARY KEY (id),
        CONSTRAINT fk_slot_holds_slot
          FOREIGN KEY (slot_id) REFERENCES appointment_slots(id) ON DELETE CASCADE,
        CONSTRAINT fk_slot_holds_patient
          FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      "CREATE INDEX idx_slot_holds_slot_status_expiry ON slot_holds(slot_id, status, expires_at)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_slot_holds_patient_status ON slot_holds(patient_profile_id, status)",
    );

    await queryRunner.query(`
      CREATE TABLE appointments (
        id char(36) NOT NULL,
        slot_id char(36) NOT NULL,
        hold_id char(36) NOT NULL,
        patient_profile_id char(36) NOT NULL,
        doctor_profile_id char(36) NOT NULL,
        scheduled_start_at datetime(3) NOT NULL,
        scheduled_end_at datetime(3) NOT NULL,
        mode enum('VIDEO', 'CHAMBER') NOT NULL,
        fee_amount decimal(10,2) NOT NULL,
        status enum('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'PAYMENT_EXPIRED', 'COMPLETED', 'NO_SHOW') NOT NULL,
        payment_reference varchar(191) NULL,
        cancellation_reason varchar(500) NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_appointments PRIMARY KEY (id),
        CONSTRAINT uq_appointments_hold UNIQUE (hold_id),
        CONSTRAINT fk_appointments_slot
          FOREIGN KEY (slot_id) REFERENCES appointment_slots(id) ON DELETE RESTRICT,
        CONSTRAINT fk_appointments_hold
          FOREIGN KEY (hold_id) REFERENCES slot_holds(id) ON DELETE RESTRICT,
        CONSTRAINT fk_appointments_patient
          FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
        CONSTRAINT fk_appointments_doctor
          FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query("CREATE INDEX idx_appointments_slot ON appointments(slot_id)");
    await queryRunner.query(
      "CREATE INDEX idx_appointments_patient_start ON appointments(patient_profile_id, scheduled_start_at)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_appointments_doctor_start ON appointments(doctor_profile_id, scheduled_start_at)",
    );
    await queryRunner.query("CREATE INDEX idx_appointments_status ON appointments(status)");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE appointments");
    await queryRunner.query("DROP TABLE slot_holds");
    await queryRunner.query("DROP INDEX idx_appointment_slots_hold_expiry ON appointment_slots");
    await queryRunner.query("ALTER TABLE appointment_slots DROP COLUMN held_until");
  }
}
