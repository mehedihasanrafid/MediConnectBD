import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddFamilyMembers1761393600000 implements MigrationInterface {
  name = "AddFamilyMembers1761393600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE family_members (
        id char(36) NOT NULL,
        patient_profile_id char(36) NOT NULL,
        name varchar(80) NOT NULL,
        relationship varchar(40) NOT NULL,
        date_of_birth date NULL,
        phone varchar(32) NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_family_members PRIMARY KEY (id),
        CONSTRAINT fk_family_members_patient FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      "CREATE INDEX idx_family_members_patient ON family_members(patient_profile_id)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("family_members");
  }
}
