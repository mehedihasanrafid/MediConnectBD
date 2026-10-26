import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReminderColumns1761500000000 implements MigrationInterface {
  name = "AddReminderColumns1761500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE appointments ADD COLUMN reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE`
    );
    await queryRunner.query(
      `ALTER TABLE appointments ADD COLUMN reminder_30min_sent BOOLEAN NOT NULL DEFAULT FALSE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE appointments DROP COLUMN reminder_30min_sent`
    );
    await queryRunner.query(
      `ALTER TABLE appointments DROP COLUMN reminder_24h_sent`
    );
  }
}
