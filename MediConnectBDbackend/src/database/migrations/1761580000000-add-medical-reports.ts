/**
 * Migration adding the `medical_reports` table for patient clinical documents shared with treating
 * doctors.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMedicalReports1761580000000 implements MigrationInterface {
  name = "AddMedicalReports1761580000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`medical_reports\` (
        \`id\` char(36) NOT NULL,
        \`patient_profile_id\` char(36) NOT NULL,
        \`title\` varchar(200) NOT NULL,
        \`file_name\` varchar(255) NOT NULL,
        \`mime_type\` varchar(100) NOT NULL,
        \`size_bytes\` int unsigned NOT NULL,
        \`content_base64\` mediumtext NOT NULL,
        \`notes\` varchar(1000) NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`idx_medical_reports_patient\` (\`patient_profile_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_medical_reports_patient\`
          FOREIGN KEY (\`patient_profile_id\`)
          REFERENCES \`patient_profiles\`(\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`medical_reports\``);
  }
}
