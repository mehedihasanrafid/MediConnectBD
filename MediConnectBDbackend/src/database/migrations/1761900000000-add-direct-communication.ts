import type { MigrationInterface, QueryRunner } from "typeorm";

/** Additive tables; consultation records and existing messages stay intact. */
export class AddDirectCommunication1761900000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE direct_conversations (
      id char(36) NOT NULL PRIMARY KEY, conversation_key varchar(100) NOT NULL,
      kind varchar(16) NOT NULL, member_a_id char(36) NOT NULL, member_b_id char(36) NOT NULL,
      a_read_at datetime(3) NULL, b_read_at datetime(3) NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_direct_conversation_key (conversation_key),
      KEY idx_direct_member_a (member_a_id), KEY idx_direct_member_b (member_b_id),
      CONSTRAINT fk_direct_member_a FOREIGN KEY (member_a_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_direct_member_b FOREIGN KEY (member_b_id) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE direct_messages (
      id char(36) NOT NULL PRIMARY KEY, conversation_id char(36) NOT NULL, sender_id char(36) NOT NULL,
      sender_role varchar(20) NOT NULL, sender_name varchar(180) NOT NULL, content text NOT NULL,
      idempotency_key varchar(128) NULL, created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_direct_messages_history (conversation_id, created_at, id),
      UNIQUE KEY uq_direct_message_key (conversation_id, sender_id, idempotency_key),
      CONSTRAINT fk_direct_message_conversation FOREIGN KEY (conversation_id) REFERENCES direct_conversations(id) ON DELETE RESTRICT,
      CONSTRAINT fk_direct_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE communication_calls (
      id char(36) NOT NULL PRIMARY KEY, conversation_ref varchar(64) NOT NULL,
      caller_id char(36) NOT NULL, callee_id char(36) NOT NULL, media varchar(8) NOT NULL, status varchar(12) NOT NULL,
      idempotency_key char(36) NOT NULL, expires_at datetime(3) NOT NULL,
      answered_at datetime(3) NULL, ended_at datetime(3) NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_calls_caller (caller_id, created_at), KEY idx_calls_callee (callee_id, created_at),
      UNIQUE KEY uq_calls_request (caller_id, idempotency_key),
      CONSTRAINT fk_call_caller FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_call_callee FOREIGN KEY (callee_id) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(): Promise<void> {
    throw new Error("Messaging retention requires an explicitly reviewed rollback; existing messages and call history must be preserved");
  }
}
