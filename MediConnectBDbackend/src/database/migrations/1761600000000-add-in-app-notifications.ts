/**
 * Migration adding the `in_app_notifications` table for role-aware, context-rich user alerts.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInAppNotifications1761600000000 implements MigrationInterface {
  name = "AddInAppNotifications1761600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`in_app_notifications\` (
        \`id\` char(36) NOT NULL,
        \`user_id\` char(36) NOT NULL,
        \`role\` varchar(30) NOT NULL DEFAULT 'ALL',
        \`type\` varchar(40) NOT NULL,
        \`title\` varchar(200) NOT NULL,
        \`message\` text NOT NULL,
        \`details\` text NULL,
        \`priority\` varchar(20) NOT NULL DEFAULT 'info',
        \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
        \`read_at\` datetime(3) NULL,
        \`action_url\` varchar(255) NOT NULL DEFAULT '/',
        \`action_label\` varchar(100) NOT NULL DEFAULT 'View',
        \`secondary_action_url\` varchar(255) NULL,
        \`secondary_action_label\` varchar(100) NULL,
        \`metadata\` text NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`idx_notifications_user_read\` (\`user_id\`, \`is_read\`),
        INDEX \`idx_notifications_user_created\` (\`user_id\`, \`created_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_notifications_user\`
          FOREIGN KEY (\`user_id\`)
          REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`in_app_notifications\``);
  }
}
