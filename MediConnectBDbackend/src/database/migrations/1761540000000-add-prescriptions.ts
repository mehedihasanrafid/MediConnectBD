import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrescriptions1761540000000 implements MigrationInterface {
  name = "AddPrescriptions1761540000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id CHAR(36) NOT NULL,
        appointment_id CHAR(36) NOT NULL,
        patient_profile_id CHAR(36) NOT NULL,
        doctor_profile_id CHAR(36) NOT NULL,
        diagnosis TEXT NOT NULL,
        medicines JSON NOT NULL,
        tests JSON NOT NULL,
        advice TEXT NULL,
        verification_code CHAR(16) NOT NULL,
        is_editable BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_prescriptions_appointment (appointment_id),
        UNIQUE KEY uq_prescriptions_verification_code (verification_code),
        INDEX idx_prescriptions_doctor (doctor_profile_id),
        INDEX idx_prescriptions_patient (patient_profile_id),
        CONSTRAINT fk_prescriptions_appointment FOREIGN KEY (appointment_id) 
          REFERENCES appointments(id) ON DELETE CASCADE,
        CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_profile_id) 
          REFERENCES patient_profiles(id) ON DELETE CASCADE,
        CONSTRAINT fk_prescriptions_doctor FOREIGN KEY (doctor_profile_id) 
          REFERENCES doctor_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prescription_versions (
        id CHAR(36) NOT NULL,
        prescription_id CHAR(36) NOT NULL,
        diagnosis TEXT NOT NULL,
        medicines JSON NOT NULL,
        tests JSON NOT NULL,
        advice TEXT NULL,
        edited_by CHAR(36) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        INDEX idx_prescription_versions_prescription (prescription_id),
        CONSTRAINT fk_prescription_versions_prescription FOREIGN KEY (prescription_id) 
          REFERENCES prescriptions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE prescription_versions`);
    await queryRunner.query(`DROP TABLE prescriptions`);
  }
}
