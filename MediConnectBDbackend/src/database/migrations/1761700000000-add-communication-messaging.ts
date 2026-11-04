/**
 * Additive migration for doctor-patient consultation messaging:
 * conversations, conversation_participants, communication_entitlements, and messages.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommunicationMessaging1761700000000 implements MigrationInterface {
  name = "AddCommunicationMessaging1761700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`conversations\` (
        \`id\` char(36) NOT NULL,
        \`appointment_id\` char(36) NOT NULL,
        \`doctor_profile_id\` char(36) NOT NULL,
        \`patient_profile_id\` char(36) NOT NULL,
        \`family_member_id\` char(36) NULL,
        \`status\` enum('ACTIVE','EXPIRED','BLOCKED') NOT NULL DEFAULT 'ACTIVE',
        \`last_message_at\` datetime(3) NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`uq_conversations_appointment\` (\`appointment_id\`),
        INDEX \`idx_conversations_doctor\` (\`doctor_profile_id\`),
        INDEX \`idx_conversations_patient\` (\`patient_profile_id\`),
        INDEX \`idx_conversations_updated\` (\`updated_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_conversations_appointment\`
          FOREIGN KEY (\`appointment_id\`)
          REFERENCES \`appointments\`(\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_conversations_doctor\`
          FOREIGN KEY (\`doctor_profile_id\`)
          REFERENCES \`doctor_profiles\`(\`id\`)
          ON DELETE RESTRICT,
        CONSTRAINT \`fk_conversations_patient\`
          FOREIGN KEY (\`patient_profile_id\`)
          REFERENCES \`patient_profiles\`(\`id\`)
          ON DELETE RESTRICT,
        CONSTRAINT \`fk_conversations_family_member\`
          FOREIGN KEY (\`family_member_id\`)
          REFERENCES \`family_members\`(\`id\`)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`conversation_participants\` (
        \`id\` char(36) NOT NULL,
        \`conversation_id\` char(36) NOT NULL,
        \`user_id\` char(36) NOT NULL,
        \`role\` varchar(20) NOT NULL,
        \`last_read_at\` datetime(3) NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`uq_conv_participants_user\` (\`conversation_id\`, \`user_id\`),
        INDEX \`idx_conv_participants_user\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_conv_participants_conversation\`
          FOREIGN KEY (\`conversation_id\`)
          REFERENCES \`conversations\`(\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_conv_participants_user\`
          FOREIGN KEY (\`user_id\`)
          REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`communication_entitlements\` (
        \`id\` char(36) NOT NULL,
        \`conversation_id\` char(36) NOT NULL,
        \`window_starts_at\` datetime(3) NOT NULL,
        \`window_expires_at\` datetime(3) NOT NULL,
        \`is_extended\` tinyint(1) NOT NULL DEFAULT 0,
        \`extended_days_total\` int NOT NULL DEFAULT 0,
        \`extension_reason\` varchar(500) NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`uq_comm_entitlements_conv\` (\`conversation_id\`),
        INDEX \`idx_comm_entitlements_window\` (\`window_expires_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_comm_entitlements_conversation\`
          FOREIGN KEY (\`conversation_id\`)
          REFERENCES \`conversations\`(\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`messages\` (
        \`id\` char(36) NOT NULL,
        \`conversation_id\` char(36) NOT NULL,
        \`sender_id\` char(36) NOT NULL,
        \`sender_role\` varchar(20) NOT NULL,
        \`sender_name\` varchar(150) NOT NULL,
        \`content\` text NOT NULL,
        \`idempotency_key\` varchar(128) NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`idx_messages_conversation_created\` (\`conversation_id\`, \`created_at\`),
        INDEX \`idx_messages_conversation_idempotency\` (\`conversation_id\`, \`idempotency_key\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_messages_conversation\`
          FOREIGN KEY (\`conversation_id\`)
          REFERENCES \`conversations\`(\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_messages_sender\`
          FOREIGN KEY (\`sender_id\`)
          REFERENCES \`users\`(\`id\`)
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`messages\``);
    await queryRunner.query(`DROP TABLE \`communication_entitlements\``);
    await queryRunner.query(`DROP TABLE \`conversation_participants\``);
    await queryRunner.query(`DROP TABLE \`conversations\``);
  }
}
