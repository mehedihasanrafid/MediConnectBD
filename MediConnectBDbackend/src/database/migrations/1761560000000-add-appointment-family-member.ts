import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentFamilyMember1761560000000 implements MigrationInterface {
  name = "AddAppointmentFamilyMember1761560000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE appointments ADD COLUMN family_member_id CHAR(36) NULL DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE appointments ADD CONSTRAINT fk_appointments_family_member FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE appointments DROP FOREIGN KEY fk_appointments_family_member`,
    );
    await queryRunner.query(
      `ALTER TABLE appointments DROP COLUMN family_member_id`,
    );
  }
}
