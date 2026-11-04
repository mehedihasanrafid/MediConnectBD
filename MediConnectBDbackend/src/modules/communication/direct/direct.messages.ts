import { AppError } from "../../../utils/app-error";
import { DirectConversation, DirectMessage } from "./direct.entities";
import { canDirect, roleOf, type DirectActor } from "./direct.policy";
import { directMessageView } from "./direct.views";
import type { DirectStore } from "./direct.store";
import type { CreateMessageInput } from "../communication.types";

export class DirectMessages {
  constructor(private readonly store: DirectStore) {}
  async list(id: string, actor: DirectActor, query: { limit: number; before?: string | undefined }) {
    const conversation = await this.store.get(id, actor);
    const repo = this.store.db.getRepository(DirectMessage);
    const builder = repo.createQueryBuilder("m").where("m.conversationId = :id", { id });
    if (query.before) {
      const cursor = await repo.findOne({ where: { id: query.before, conversationId: id } });
      if (!cursor) throw new AppError(400, "INVALID_CURSOR", "Message cursor was not found");
      builder.andWhere("(m.createdAt < :at OR (m.createdAt = :at AND m.id < :cursor))", { at: cursor.createdAt, cursor: cursor.id });
    }
    const messages = await builder.orderBy("m.createdAt", "DESC").addOrderBy("m.id", "DESC").take(query.limit + 1).getMany();
    const hasMore = messages.length > query.limit, page = messages.slice(0, query.limit).reverse();
    const readAt = page.at(-1)?.createdAt;
    if (!query.before && readAt) {
      const column = conversation.memberAId === actor.id ? "aReadAt" : "bReadAt";
      await this.store.db.getRepository(DirectConversation).createQueryBuilder().update()
        .set({ [column]: readAt }).where("id = :id", { id })
        .andWhere(`(${column === "aReadAt" ? "a_read_at" : "b_read_at"} IS NULL OR ${column === "aReadAt" ? "a_read_at" : "b_read_at"} < :readAt)`, { readAt }).execute();
    }
    return { items: page.map(directMessageView), nextCursor: hasMore ? page[0]?.id ?? null : null, hasMore };
  }
  async send(id: string, actor: DirectActor, input: CreateMessageInput) {
    return this.store.db.transaction(async (manager) => {
      await manager.getRepository(DirectConversation).createQueryBuilder("c").where("c.id = :id", { id }).setLock("pessimistic_write").getOne();
      const conversation = await this.store.get(id, actor, manager);
      const repo = manager.getRepository(DirectMessage);
      if (input.idempotencyKey) {
        const existing = await repo.findOne({ where: { conversationId: id, senderId: actor.id, idempotencyKey: input.idempotencyKey } });
        if (existing) {
          if (existing.content !== input.content) throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This request key was already used for another message");
          return { message: directMessageView(existing), replay: true };
        }
      }
      if (!canDirect(conversation.kind, conversation.memberA, conversation.memberB)) throw new AppError(409, "COMMUNICATION_UNAVAILABLE", "Messaging is unavailable for this conversation");
      const sender = conversation.memberAId === actor.id ? conversation.memberA : conversation.memberB;
      const message = await repo.save(repo.create({ conversationId: id, senderId: actor.id, senderRole: roleOf(sender),
        senderName: `${sender.firstName} ${sender.lastName}`, content: input.content, idempotencyKey: input.idempotencyKey ?? null, createdAt: new Date() }));
      await manager.update(DirectConversation, { id }, { updatedAt: new Date() });
      return { message: directMessageView(message), replay: false };
    });
  }
}
