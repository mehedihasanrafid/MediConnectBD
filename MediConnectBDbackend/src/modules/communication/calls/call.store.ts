import { Brackets, type DataSource } from "typeorm";
import { AppError } from "../../../utils/app-error";
import { User } from "../../users/user.entity";
import { CommunicationCall, type CallMedia } from "./call.entity";
import { effectiveCallStatus, nextCallStatus, requireCallMember, type CallAction } from "./call.policy";

export class CallStore {
  constructor(readonly db: DataSource) {}
  async get(id: string, userId: string) {
    const call = await this.db.getRepository(CommunicationCall).findOne({ where: { id }, relations: { caller: true, callee: true } });
    if (!call) throw new AppError(404, "CALL_NOT_FOUND", "Call was not found");
    requireCallMember(call, userId); return call;
  }
  view(call: CommunicationCall, now: Date) {
    const person = (user: User) => ({ userId: user.id, name: `${user.firstName} ${user.lastName}` });
    return { id: call.id, conversationId: call.conversationRef, caller: person(call.caller), callee: person(call.callee),
      media: call.media, status: effectiveCallStatus(call, now), createdAt: call.createdAt.toISOString(),
      answeredAt: call.answeredAt?.toISOString() ?? null, endedAt: call.endedAt?.toISOString() ?? null, expiresAt: call.expiresAt.toISOString() };
  }
  async expire(userId: string, now: Date) {
    await this.db.getRepository(CommunicationCall).createQueryBuilder().update()
      .set({ status: () => "CASE WHEN status = 'RINGING' THEN 'MISSED' ELSE 'ENDED' END", endedAt: () => "expires_at" })
      .where("(caller_id = :userId OR callee_id = :userId)", { userId })
      .andWhere("status IN ('RINGING', 'ACCEPTED') AND expires_at <= :now", { now }).execute();
  }
  async list(userId: string, now: Date, reference?: string, active = false) {
    await this.expire(userId, now);
    const query = this.db.getRepository(CommunicationCall).createQueryBuilder("c")
      .leftJoinAndSelect("c.caller", "caller").leftJoinAndSelect("c.callee", "callee")
      .where(new Brackets((q) => q.where("c.callerId = :userId", { userId }).orWhere("c.calleeId = :userId", { userId })));
    if (reference) query.andWhere("c.conversationRef = :reference", { reference });
    if (active) query.andWhere("c.status IN ('RINGING', 'ACCEPTED')");
    const calls = await query.orderBy("c.createdAt", "DESC").take(active ? 1 : 30).getMany();
    return calls.map((call) => this.view(call, now));
  }
  async create(input: { reference: string; callerId: string; calleeId: string; media: CallMedia; key: string; expiresAt: Date }, now: Date) {
    return this.db.transaction(async (manager) => {
      const users = await manager.getRepository(User).createQueryBuilder("u").select(["u.id", "u.status"])
        .where("u.id IN (:...ids)", { ids: [input.callerId, input.calleeId].sort() }).orderBy("u.id", "ASC")
        .setLock("pessimistic_write").getMany();
      if (users.length !== 2 || users.some((user) => user.status !== "ACTIVE")) throw new AppError(409, "CALL_UNAVAILABLE", "A call participant is unavailable");
      const repo = manager.getRepository(CommunicationCall);
      const replay = await repo.findOne({ where: { callerId: input.callerId, idempotencyKey: input.key } });
      if (replay) {
        if (replay.conversationRef !== input.reference || replay.calleeId !== input.calleeId || replay.media !== input.media) {
          throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This call request key was already used for another call");
        }
        return replay.id;
      }
      const busy = await repo.createQueryBuilder("c")
        .where("(c.callerId IN (:...ids) OR c.calleeId IN (:...ids))", { ids: [input.callerId, input.calleeId] })
        .andWhere("c.status IN ('RINGING', 'ACCEPTED') AND c.expiresAt > :now", { now }).getOne();
      if (busy) throw new AppError(409, "CALL_BUSY", "You or the other person already has an active call");
      const call = await repo.save(repo.create({ conversationRef: input.reference, callerId: input.callerId,
        calleeId: input.calleeId, media: input.media, status: "RINGING", idempotencyKey: input.key, expiresAt: input.expiresAt, createdAt: now }));
      return call.id;
    });
  }
  async act(id: string, userId: string, action: CallAction, now: Date, closesAt?: Date | null) {
    await this.db.transaction(async (manager) => {
      const repo = manager.getRepository(CommunicationCall);
      const call = await repo.createQueryBuilder("c").where("c.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!call) throw new AppError(404, "CALL_NOT_FOUND", "Call was not found");
      const status = nextCallStatus(call, userId, action, now);
      if (call.status === status) return;
      call.status = status;
      if (status === "ACCEPTED") {
        call.answeredAt = now;
        call.expiresAt = new Date(Math.min(now.getTime() + 30 * 60000, closesAt?.getTime() ?? Infinity));
      } else call.endedAt = now;
      await repo.save(call);
    });
    return this.get(id, userId);
  }
}
