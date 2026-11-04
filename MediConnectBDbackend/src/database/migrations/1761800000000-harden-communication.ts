import type { MigrationInterface, QueryRunner } from "typeorm";

export class HardenCommunication1761800000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE appointments ADD completed_at datetime(3) NULL");
    // Conservative legacy fallback; cannot recover the true historical completion instant.
    await q.query("UPDATE appointments SET completed_at = scheduled_end_at WHERE status = 'COMPLETED' AND completed_at IS NULL");
    for (const [table, key, column, target] of [
      ["conversations", "fk_conversations_appointment", "appointment_id", "appointments"],
      ["conversations", "fk_conversations_family_member", "family_member_id", "family_members"],
      ["messages", "fk_messages_conversation", "conversation_id", "conversations"],
      ["conversation_participants", "fk_conv_participants_conversation", "conversation_id", "conversations"],
      ["conversation_participants", "fk_conv_participants_user", "user_id", "users"],
      ["communication_entitlements", "fk_comm_entitlements_conversation", "conversation_id", "conversations"],
    ]) {
      await q.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${key}\``);
      await q.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${key}\` FOREIGN KEY (\`${column}\`) REFERENCES \`${target}\`(id) ON DELETE RESTRICT`);
    }
    // Clear duplicate keys without deleting messages, then protect future concurrent retries.
    await q.query("UPDATE messages newer JOIN messages older ON newer.conversation_id=older.conversation_id AND newer.sender_id=older.sender_id AND newer.idempotency_key=older.idempotency_key AND newer.id > older.id SET newer.idempotency_key=NULL");
    await q.query("ALTER TABLE messages ADD UNIQUE INDEX uq_messages_sender_key(conversation_id,sender_id,idempotency_key)");
  }
  async down(): Promise<void> {
    throw new Error("Retention hardening rollback requires an explicit reviewed migration; no destructive automatic rollback");
  }
}
