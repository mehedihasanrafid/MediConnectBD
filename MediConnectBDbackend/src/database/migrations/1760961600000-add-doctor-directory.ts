/**
 * Schema history: 1760961600000-add-doctor-directory.ts. Apply through the registered TypeORM
 * migration sequence; do not rewrite an already applied migration. The up/down order follows
 * foreign-key dependencies, and a down migration can remove schema/data subject to its explicit
 * guards.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDoctorDirectory1760961600000 implements MigrationInterface {
  name = "AddDoctorDirectory1760961600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE doctor_profiles
        ADD COLUMN photo_url varchar(500) NULL AFTER bio,
        ADD COLUMN languages json NULL AFTER photo_url,
        ADD COLUMN video_consultation_fee decimal(10,2) NULL AFTER languages,
        ADD COLUMN reviewed_by_user_id char(36) NULL AFTER reviewed_at,
        ADD CONSTRAINT fk_doctor_profiles_reviewer
          FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    await queryRunner.query(
      "CREATE INDEX idx_doctor_profiles_application_status ON doctor_profiles(application_status)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_doctor_profiles_video_fee ON doctor_profiles(video_consultation_fee)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_doctor_profiles_reviewer ON doctor_profiles(reviewed_by_user_id)",
    );

    await queryRunner.query(`
      CREATE TABLE doctor_chambers (
        id char(36) NOT NULL,
        doctor_profile_id char(36) NOT NULL,
        hospital_id char(36) NOT NULL,
        room_or_unit varchar(120) NULL,
        consultation_fee decimal(10,2) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_doctor_chambers PRIMARY KEY (id),
        CONSTRAINT uq_doctor_chambers_doctor_hospital UNIQUE (doctor_profile_id, hospital_id),
        CONSTRAINT fk_doctor_chambers_doctor
          FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE,
        CONSTRAINT fk_doctor_chambers_hospital
          FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      "CREATE INDEX idx_doctor_chambers_hospital_active_fee ON doctor_chambers(hospital_id, is_active, consultation_fee)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE doctor_chambers");
    await queryRunner.query("ALTER TABLE doctor_profiles DROP FOREIGN KEY fk_doctor_profiles_reviewer");
    await queryRunner.query("DROP INDEX idx_doctor_profiles_reviewer ON doctor_profiles");
    await queryRunner.query("DROP INDEX idx_doctor_profiles_video_fee ON doctor_profiles");
    await queryRunner.query(
      "DROP INDEX idx_doctor_profiles_application_status ON doctor_profiles",
    );
    await queryRunner.query(`
      ALTER TABLE doctor_profiles
        DROP COLUMN reviewed_by_user_id,
        DROP COLUMN video_consultation_fee,
        DROP COLUMN languages,
        DROP COLUMN photo_url
    `);
  }
}
