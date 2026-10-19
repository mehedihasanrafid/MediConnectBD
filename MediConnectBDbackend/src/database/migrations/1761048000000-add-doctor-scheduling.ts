/**
 * Schema history: 1761048000000-add-doctor-scheduling.ts. Apply through the registered TypeORM
 * migration sequence; do not rewrite an already applied migration. The up/down order follows
 * foreign-key dependencies, and a down migration can remove schema/data subject to its explicit
 * guards.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDoctorScheduling1761048000000 implements MigrationInterface {
  name = "AddDoctorScheduling1761048000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE doctor_schedules (
        id char(36) NOT NULL,
        doctor_profile_id char(36) NOT NULL,
        day_of_week tinyint unsigned NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL,
        slot_duration_minutes smallint unsigned NOT NULL,
        mode enum('VIDEO', 'CHAMBER') NOT NULL,
        chamber_id char(36) NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_doctor_schedules PRIMARY KEY (id),
        CONSTRAINT fk_doctor_schedules_doctor
          FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE,
        CONSTRAINT fk_doctor_schedules_chamber
          FOREIGN KEY (chamber_id) REFERENCES doctor_chambers(id) ON DELETE CASCADE,
        CONSTRAINT ck_doctor_schedules_day CHECK (day_of_week BETWEEN 0 AND 6),
        CONSTRAINT ck_doctor_schedules_times CHECK (start_time < end_time),
        CONSTRAINT ck_doctor_schedules_mode_chamber CHECK (
          (mode = 'VIDEO' AND chamber_id IS NULL) OR
          (mode = 'CHAMBER' AND chamber_id IS NOT NULL)
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      "CREATE INDEX idx_doctor_schedules_doctor_day_active ON doctor_schedules(doctor_profile_id, day_of_week, is_active)",
    );
    await queryRunner.query("CREATE INDEX idx_doctor_schedules_chamber ON doctor_schedules(chamber_id)");

    await queryRunner.query(`
      CREATE TABLE schedule_time_off (
        id char(36) NOT NULL,
        doctor_profile_id char(36) NOT NULL,
        date date NOT NULL,
        start_time time NULL,
        end_time time NULL,
        reason varchar(300) NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_schedule_time_off PRIMARY KEY (id),
        CONSTRAINT fk_schedule_time_off_doctor
          FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE,
        CONSTRAINT ck_schedule_time_off_range CHECK (
          (start_time IS NULL AND end_time IS NULL) OR
          (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      "CREATE INDEX idx_schedule_time_off_doctor_date ON schedule_time_off(doctor_profile_id, date)",
    );

    await queryRunner.query(`
      CREATE TABLE appointment_slots (
        id char(36) NOT NULL,
        doctor_profile_id char(36) NOT NULL,
        schedule_id char(36) NULL,
        chamber_id char(36) NULL,
        start_at datetime(3) NOT NULL,
        end_at datetime(3) NOT NULL,
        mode enum('VIDEO', 'CHAMBER') NOT NULL,
        fee_amount decimal(10,2) NOT NULL,
        status enum('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED') NOT NULL DEFAULT 'AVAILABLE',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_appointment_slots PRIMARY KEY (id),
        CONSTRAINT uq_appointment_slots_doctor_start UNIQUE (doctor_profile_id, start_at),
        CONSTRAINT fk_appointment_slots_doctor
          FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE,
        CONSTRAINT fk_appointment_slots_schedule
          FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE SET NULL,
        CONSTRAINT fk_appointment_slots_chamber
          FOREIGN KEY (chamber_id) REFERENCES doctor_chambers(id) ON DELETE SET NULL,
        CONSTRAINT ck_appointment_slots_times CHECK (start_at < end_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      "CREATE INDEX idx_appointment_slots_public_availability ON appointment_slots(doctor_profile_id, status, start_at)",
    );
    await queryRunner.query("CREATE INDEX idx_appointment_slots_schedule ON appointment_slots(schedule_id)");
    await queryRunner.query("CREATE INDEX idx_appointment_slots_chamber ON appointment_slots(chamber_id)");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE appointment_slots");
    await queryRunner.query("DROP TABLE schedule_time_off");
    await queryRunner.query("DROP TABLE doctor_schedules");
  }
}
