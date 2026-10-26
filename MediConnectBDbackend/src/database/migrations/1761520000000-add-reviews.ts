import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviews1761520000000 implements MigrationInterface {
  name = "AddReviews1761520000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id CHAR(36) NOT NULL,
        appointment_id CHAR(36) NOT NULL,
        patient_profile_id CHAR(36) NOT NULL,
        doctor_profile_id CHAR(36) NOT NULL,
        rating TINYINT UNSIGNED NOT NULL,
        comment TEXT NULL,
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_reviews_appointment (appointment_id),
        INDEX idx_reviews_doctor (doctor_profile_id),
        INDEX idx_reviews_patient (patient_profile_id),
        CONSTRAINT fk_reviews_appointment FOREIGN KEY (appointment_id) 
          REFERENCES appointments(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_patient FOREIGN KEY (patient_profile_id) 
          REFERENCES patient_profiles(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_doctor FOREIGN KEY (doctor_profile_id) 
          REFERENCES doctor_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE reviews`);
  }
}
