import { DataSource, EntityManager } from "typeorm";
import { AppError } from "../../../utils/app-error";
import { User } from "../../users/user.entity";
import { DirectConversation, DirectMessage, type DirectKind } from "./direct.entities";
import { approvedDoctor, canDirect, directKey, requireDirectMember, rolesOf, type DirectActor } from "./direct.policy";
import { contactView, directView } from "./direct.views";

const relations = { memberA: { roles: true, doctorProfile: true }, memberB: { roles: true, doctorProfile: true } };
export class DirectStore {
  constructor(readonly db: DataSource) {}
  async user(id: string, manager: EntityManager = this.db.manager) {
    const user = await manager.findOne(User, { where: { id }, relations: { roles: true, doctorProfile: true } });
    if (!user || user.status !== "ACTIVE") throw new AppError(403, "CONTACT_UNAVAILABLE", "This contact is unavailable");
    return user;
  }
  async get(id: string, actor: DirectActor, manager: EntityManager = this.db.manager) {
    const conversation = await manager.findOne(DirectConversation, { where: { id }, relations });
    if (!conversation) throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found");
    requireDirectMember(conversation, actor);
    return conversation;
  }
  async contacts(actor: DirectActor, kind: DirectKind, search = "") {
    const self = await this.user(actor.id);
    if (kind === "COLLEAGUE" && !approvedDoctor(self) || kind === "STAFF" && !rolesOf(self).includes("ADMIN") ||
      kind === "SUPPORT" && rolesOf(self).includes("ADMIN")) throw new AppError(403, "CONTACTS_FORBIDDEN", "This contact group is unavailable");
    const query = this.db.getRepository(User).createQueryBuilder("u").innerJoinAndSelect("u.roles", "r")
      .leftJoinAndSelect("u.doctorProfile", "d").where("u.status = :status AND u.id != :self", { status: "ACTIVE", self: actor.id })
      .andWhere("r.name = :role", { role: kind === "COLLEAGUE" ? "DOCTOR" : "ADMIN" });
    if (kind === "COLLEAGUE") query.andWhere("d.applicationStatus = :approved", { approved: "APPROVED" });
    if (search) query.andWhere("CONCAT(u.firstName, ' ', u.lastName) LIKE :search", { search: `%${search}%` });
    const users = await query.orderBy("u.firstName", "ASC").addOrderBy("u.id", "ASC").take(30).getMany();
    return users.map((user) => contactView(user, kind === "COLLEAGUE"));
  }
  async create(actor: DirectActor, kind: DirectKind, recipientId?: string) {
    if (kind !== "SUPPORT" && !recipientId) throw new AppError(422, "RECIPIENT_REQUIRED", "Choose a recipient");
    const self = await this.user(actor.id);
    const target = recipientId ?? (await this.contacts(actor, kind))[0]?.userId;
    if (!target) throw new AppError(503, "SUPPORT_UNAVAILABLE", "No support agent is available. Try again later.");
    const other = await this.user(target);
    if (!canDirect(kind, self, other)) throw new AppError(403, "DIRECT_CONVERSATION_FORBIDDEN", "These accounts cannot start this conversation");
    const requester = rolesOf(self).includes("ADMIN") ? other.id : self.id;
    const key = directKey(kind, self.id, other.id, requester);
    const repo = this.db.getRepository(DirectConversation);
    let conversation = await repo.findOne({ where: { key }, relations });
    if (!conversation) {
      try { conversation = await repo.save(repo.create({ key, kind, memberAId: self.id, memberBId: other.id,
        createdAt: new Date(), updatedAt: new Date() })); }
      catch (error: any) { if (error.code !== "ER_DUP_ENTRY") throw error; }
      conversation = await repo.findOne({ where: { key }, relations });
    }
    if (!conversation) throw new AppError(500, "CONVERSATION_CREATE_FAILED", "Could not create conversation");
    requireDirectMember(conversation, actor);
    return directView(conversation, actor.id, null, 0);
  }
  async list(actor: DirectActor) {
    const rows = await this.db.getRepository(DirectConversation).find({ where: [{ memberAId: actor.id }, { memberBId: actor.id }],
      relations, order: { updatedAt: "DESC" }, take: 100 });
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id), messages = this.db.getRepository(DirectMessage);
    const latest = await messages.createQueryBuilder("m").where("m.conversationId IN (:...ids)", { ids })
      .andWhere("m.id = (SELECT newest.id FROM direct_messages newest WHERE newest.conversation_id = m.conversation_id ORDER BY newest.created_at DESC, newest.id DESC LIMIT 1)").getMany();
    const counts = await messages.createQueryBuilder("m").innerJoin(DirectConversation, "c", "c.id = m.conversationId")
      .select("m.conversationId", "id").addSelect("COUNT(*)", "count").where("m.conversationId IN (:...ids)", { ids })
      .andWhere("m.senderId != :me", { me: actor.id })
      .andWhere("(CASE WHEN c.memberAId = :me THEN c.aReadAt ELSE c.bReadAt END IS NULL OR m.createdAt > CASE WHEN c.memberAId = :me THEN c.aReadAt ELSE c.bReadAt END)", { me: actor.id })
      .groupBy("m.conversationId").getRawMany<{ id: string; count: string }>();
    return rows.map((row) => directView(row, actor.id, latest.find((message) => message.conversationId === row.id) ?? null,
      Number(counts.find((count) => count.id === row.id)?.count ?? 0)));
  }
  async detail(id: string, actor: DirectActor) {
    return directView(await this.get(id, actor), actor.id, null, 0);
  }
}
