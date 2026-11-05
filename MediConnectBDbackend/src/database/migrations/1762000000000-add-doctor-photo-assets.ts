import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDoctorPhotoAssets1762000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE doctor_photo_assets (
        id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
        image mediumblob NOT NULL
      ) ENGINE=InnoDB
    `);
  }

  async down(): Promise<void> {
    throw new Error("Reverting this migration would delete uploaded photos. Keep the additive table when rolling back application code.");
  }
}
