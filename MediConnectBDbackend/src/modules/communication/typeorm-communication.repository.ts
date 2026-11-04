/**
 * TypeORM implementation of the Communication repository.
 * Handles conversation provisioning from confirmed appointments, 7-day follow-up window
 * entitlement checking, strict doctor/patient ownership, cursor pagination, and idempotent message creation.
 */

import { DataSource } from "typeorm";
import { AppError } from "../../utils/app-error";
import { Appointment, AppointmentStatus } from "../appointments/appointment.entity";
import { ConsultationMode } from "../appointments/consultation-mode";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { User } from "../users/user.entity";
import type { CommunicationRepository } from "./communication.repository";
import type {
  ActorContext,
  BeneficiaryView,
  CommunicationEntitlementView,
  ConversationDetailView,
  ConversationSummaryView,
  CreateMessageInput,
  MessageView,
  PaginatedMessagesView,
  ParticipantView,
} from "./communication.types";
import {
  CommunicationEntitlement,
  Conversation,
  ConversationParticipant,
  ConversationStatus,
} from "./conversation.entity";
import { Message } from "./message.entity";

import { authorizeConversation, communicationCapabilities, communicationExpiry } from "./communication-policy";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class TypeOrmCommunicationRepository implements CommunicationRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Automatically discovers eligible confirmed/completed appointments for the actor
   * that do not yet have a conversation record and provisions them.
   */
  async syncEligibleConversations(actor: ActorContext, now: Date): Promise<void> {
    const appointmentRepo = this.dataSource.getRepository(Appointment);
    const conversationRepo = this.dataSource.getRepository(Conversation);

    // Eligible statuses: CONFIRMED or COMPLETED
    const eligibleStatuses = [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED];

    let query = appointmentRepo
      .createQueryBuilder("appointment")
      .leftJoinAndSelect("appointment.doctor", "doctor")
      .leftJoinAndSelect("doctor.user", "doctorUser")
      .leftJoinAndSelect("appointment.patientProfile", "patientProfile")
      .leftJoinAndSelect("patientProfile.user", "patientUser")
      .leftJoinAndSelect("appointment.familyMember", "familyMember")
      .leftJoin(Conversation, "existingConversation", "existingConversation.appointmentId = appointment.id")
      .where("appointment.status IN (:...statuses)", { statuses: eligibleStatuses })
      .andWhere("existingConversation.id IS NULL");

    if (actor.userRole === "DOCTOR" && actor.doctorProfileId) {
      query = query.andWhere("appointment.doctorProfileId = :doctorProfileId", {
        doctorProfileId: actor.doctorProfileId,
      });
    } else if (actor.userRole === "PATIENT" && actor.patientProfileId) {
      query = query.andWhere("appointment.patientProfileId = :patientProfileId", {
        patientProfileId: actor.patientProfileId,
      });
    } else {
      return;
    }

    const appointments = await query.getMany();

    for (const appt of appointments) {
      if ((actor.userRole === "DOCTOR" ? appt.doctor?.user?.id : appt.patientProfile?.user?.id) !== actor.userId) continue;
      if (appt.familyMember && appt.familyMember.patientProfileId !== appt.patientProfileId) continue;
      // Check if conversation already exists for this appointment
      const exists = await conversationRepo.findOne({
        where: { appointmentId: appt.id },
      });

      if (!exists && appt.doctor && appt.doctor.user && appt.patientProfile && appt.patientProfile.user) {
        // Calculate entitlement window
        const windowStartsAt = appt.scheduledStartAt;
        let windowExpiresAt: Date;

        if (appt.status === AppointmentStatus.COMPLETED && appt.completedAt) {
          // Reliable post-completion timestamp: exactly 7 days after conclusion
          windowExpiresAt = new Date(appt.completedAt.getTime() + SEVEN_DAYS_MS);
        } else {
          // Active confirmed appointment: valid through scheduled end + 7 days
          windowExpiresAt = new Date(appt.scheduledEndAt.getTime() + SEVEN_DAYS_MS);
        }

        try { await this.dataSource.transaction(async (manager) => {
          const conv = manager.create(Conversation, {
            appointmentId: appt.id,
            doctorProfileId: appt.doctorProfileId,
            patientProfileId: appt.patientProfileId,
            familyMemberId: appt.familyMemberId,
            status: ConversationStatus.ACTIVE,
            lastMessageAt: null,
          });
          const savedConv = await manager.save(conv);

          const entitlement = manager.create(CommunicationEntitlement, {
            conversationId: savedConv.id,
            windowStartsAt,
            windowExpiresAt,
            isExtended: false,
            extendedDaysTotal: 0,
            extensionReason: null,
          });
          await manager.save(entitlement);

          const doctorParticipant = manager.create(ConversationParticipant, {
            conversationId: savedConv.id,
            userId: appt.doctor.user.id,
            role: "DOCTOR",
            lastReadAt: now,
          });
          const patientParticipant = manager.create(ConversationParticipant, {
            conversationId: savedConv.id,
            userId: appt.patientProfile.user.id,
            role: "PATIENT",
            lastReadAt: now,
          });
          await manager.save([doctorParticipant, patientParticipant]);
        }); } catch (error: any) { if (error.code !== "ER_DUP_ENTRY") throw error; }
      }
    }
  }

  async listConversations(actor: ActorContext, now: Date): Promise<ConversationSummaryView[]> {
    await this.syncEligibleConversations(actor, now);

    const convRepo = this.dataSource.getRepository(Conversation);
    const messageRepo = this.dataSource.getRepository(Message);
    const participantRepo = this.dataSource.getRepository(ConversationParticipant);

    let whereClause: Record<string, string> = {};
    if (actor.userRole === "DOCTOR") {
      if (!actor.doctorProfileId) return [];
      whereClause = { doctorProfileId: actor.doctorProfileId };
    } else {
      if (!actor.patientProfileId) return [];
      whereClause = { patientProfileId: actor.patientProfileId };
    }

    const conversations = await convRepo.find({
      where: whereClause,
      relations: {
        appointment: true,
        doctorProfile: { user: true, specialties: true },
        patientProfile: { user: true },
        familyMember: true,
        entitlement: true,
        participants: true,
      },
      order: {
        updatedAt: "DESC",
      },
    });

    const summaries: ConversationSummaryView[] = [];
    const ids = conversations.map((conversation) => conversation.id);
    const latest = ids.length ? await messageRepo.createQueryBuilder("m").where("m.conversationId IN (:...ids)", { ids })
      .andWhere("m.id = (SELECT newest.id FROM messages newest WHERE newest.conversation_id = m.conversation_id ORDER BY newest.created_at DESC, newest.id DESC LIMIT 1)").getMany() : [];
    const unread = ids.length ? await messageRepo.createQueryBuilder("m")
      .innerJoin(ConversationParticipant, "p", "p.conversationId = m.conversationId AND p.userId = :userId", { userId: actor.userId })
      .select("m.conversationId", "id").addSelect("COUNT(*)", "count").where("m.conversationId IN (:...ids)", { ids })
      .andWhere("m.senderId != :userId AND (p.lastReadAt IS NULL OR m.createdAt > p.lastReadAt)", { userId: actor.userId })
      .groupBy("m.conversationId").getRawMany<{ id: string; count: string }>() : [];

    for (const conv of conversations) {
      try { authorizeConversation(conv, actor); } catch { continue; }
      const capabilities = communicationCapabilities(conv, now);
      // Find latest message
      const latestMsg = latest.find((message) => message.conversationId === conv.id);
      const unreadCount = Number(unread.find((count) => count.id === conv.id)?.count ?? 0);

      // Determine counterparty participant details
      let participantView: ParticipantView;
      if (actor.userRole === "DOCTOR") {
        const patientUser = conv.patientProfile?.user;
        participantView = {
          userId: patientUser?.id ?? conv.patientProfile?.userId ?? "",
          role: "PATIENT",
          name: patientUser ? `${patientUser.firstName} ${patientUser.lastName}`.trim() : "Patient",
          subtitle: conv.familyMember
            ? `Beneficiary: ${conv.familyMember.name} (${conv.familyMember.relationship})`
            : "Primary Patient",
          avatarUrl: null,
        };
      } else {
        const docUser = conv.doctorProfile?.user;
        const specialty = conv.doctorProfile?.specialties?.[0]?.name ?? "Consultant Specialist";
        participantView = {
          userId: docUser?.id ?? conv.doctorProfile?.userId ?? "",
          role: "DOCTOR",
          name: docUser ? `Dr. ${docUser.firstName} ${docUser.lastName}`.trim() : "Doctor",
          subtitle: `${specialty} · BMDC #${conv.doctorProfile?.bmdcNumber ?? "Verified"}`,
          avatarUrl: conv.doctorProfile?.photoUrl ?? null,
        };
      }

      // Beneficiary
      let beneficiary: BeneficiaryView | null = null;
      if (conv.familyMember) {
        beneficiary = {
          id: conv.familyMember.id,
          name: conv.familyMember.name,
          relationship: conv.familyMember.relationship,
        };
      }

      // Entitlement
      const entitlement = conv.entitlement ? { ...conv.entitlement, windowExpiresAt: communicationExpiry(conv) ?? conv.entitlement.windowExpiresAt } : null;
      const isExpired = entitlement ? now >= entitlement.windowExpiresAt : false;
      const daysRemaining = entitlement
        ? Math.max(0, Math.ceil((entitlement.windowExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        : 0;

      const entitlementView: CommunicationEntitlementView = {
        windowStartsAt: (entitlement?.windowStartsAt ?? conv.createdAt).toISOString(),
        windowExpiresAt: (entitlement?.windowExpiresAt ?? conv.createdAt).toISOString(),
        isExpired,
        daysRemaining,
        isExtended: entitlement?.isExtended ?? false,
      };

      const finalStatus = isExpired ? ConversationStatus.EXPIRED : conv.status;

      summaries.push({
        ...capabilities,
        id: conv.id,
        appointmentId: conv.appointmentId,
        appointmentMode: conv.appointment?.mode ?? "VIDEO",
        appointmentStatus: conv.appointment?.status ?? "CONFIRMED",
        scheduledStartAt: conv.appointment.scheduledStartAt.toISOString(),
        scheduledEndAt: conv.appointment.scheduledEndAt.toISOString(),
        status: finalStatus,
        participant: participantView,
        beneficiary,
        entitlement: entitlementView,
        lastMessage: latestMsg ? this.toMessageView(latestMsg) : null,
        unreadCount,
        updatedAt: conv.updatedAt.toISOString(),
      });
    }

    return summaries;
  }

  async getConversationById(
    conversationId: string,
    actor: ActorContext,
    now: Date,
  ): Promise<ConversationDetailView | null> {
    const convRepo = this.dataSource.getRepository(Conversation);
    const participantRepo = this.dataSource.getRepository(ConversationParticipant);

    const conv = await convRepo.findOne({
      where: { id: conversationId },
      relations: {
        appointment: true,
        doctorProfile: { user: true, specialties: true, chambers: { hospital: true } },
        patientProfile: { user: true },
        familyMember: true,
        entitlement: true,
        participants: true,
      },
    });

    if (!conv) return null;

    // Strict Authorization Check
    const isAuthorized = (() => { authorizeConversation(conv, actor); return true; })();

    if (!isAuthorized) {
      throw new AppError(
        403,
        "CONVERSATION_FORBIDDEN",
        "You are not authorized to access this consultation conversation",
      );
    }

    // Update lastReadAt for this actor
    await participantRepo.update(
      { conversationId: conv.id, userId: actor.userId },
      { lastReadAt: now },
    );

    const docUser = conv.doctorProfile?.user;
    const patientUser = conv.patientProfile?.user;
    const specialty = conv.doctorProfile?.specialties?.[0]?.name ?? null;
    const hospital = conv.doctorProfile?.chambers?.[0]?.hospital?.name ?? null;

    const entitlement = conv.entitlement ? { ...conv.entitlement, windowExpiresAt: communicationExpiry(conv) ?? conv.entitlement.windowExpiresAt } : null;
    const isExpired = entitlement ? now >= entitlement.windowExpiresAt : false;
    const daysRemaining = entitlement
      ? Math.max(0, Math.ceil((entitlement.windowExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    let beneficiary: BeneficiaryView | null = null;
    if (conv.familyMember) {
      beneficiary = {
        id: conv.familyMember.id,
        name: conv.familyMember.name,
        relationship: conv.familyMember.relationship,
      };
    }

    return {
      ...communicationCapabilities(conv, now),
      participant: actor.userRole === "DOCTOR" ? { userId: patientUser!.id, name: `${patientUser!.firstName} ${patientUser!.lastName}`, role: "PATIENT" as const } : { userId: docUser!.id, name: `Dr. ${docUser!.firstName} ${docUser!.lastName}`, role: "DOCTOR" as const },
      id: conv.id,
      appointmentId: conv.appointmentId,
      appointmentMode: conv.appointment?.mode ?? "VIDEO",
      appointmentStatus: conv.appointment?.status ?? "CONFIRMED",
      scheduledStartAt: (conv.appointment?.scheduledStartAt ?? conv.createdAt).toISOString(),
      scheduledEndAt: (conv.appointment?.scheduledEndAt ?? conv.createdAt).toISOString(),
      status: isExpired ? ConversationStatus.EXPIRED : conv.status,
      doctor: {
        profileId: conv.doctorProfileId,
        userId: docUser?.id ?? conv.doctorProfile?.userId ?? "",
        name: docUser ? `Dr. ${docUser.firstName} ${docUser.lastName}`.trim() : "Doctor",
        specialty,
        hospital,
        avatarUrl: conv.doctorProfile?.photoUrl ?? null,
      },
      patient: {
        profileId: conv.patientProfileId,
        userId: patientUser?.id ?? conv.patientProfile?.userId ?? "",
        name: patientUser ? `${patientUser.firstName} ${patientUser.lastName}`.trim() : "Patient",
      },
      beneficiary,
      entitlement: {
        windowStartsAt: (entitlement?.windowStartsAt ?? conv.createdAt).toISOString(),
        windowExpiresAt: (entitlement?.windowExpiresAt ?? conv.createdAt).toISOString(),
        isExpired,
        daysRemaining,
        isExtended: entitlement?.isExtended ?? false,
      },
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    };
  }

  async listMessages(
    conversationId: string,
    actor: ActorContext,
    query: { limit: number; before?: string | undefined },
  ): Promise<PaginatedMessagesView> {
    const convRepo = this.dataSource.getRepository(Conversation);
    const messageRepo = this.dataSource.getRepository(Message);
    const participantRepo = this.dataSource.getRepository(ConversationParticipant);

    const conv = await convRepo.findOne({
      where: { id: conversationId },
      relations: { appointment: true, doctorProfile: { user: true }, patientProfile: { user: true }, familyMember: true },
    });

    if (!conv) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
    }

    const isAuthorized = (() => { authorizeConversation(conv, actor); return true; })();

    if (!isAuthorized) {
      throw new AppError(
        403,
        "CONVERSATION_FORBIDDEN",
        "You are not authorized to view messages in this conversation",
      );
    }

    // Mark as read for this actor
    await participantRepo.update(
      { conversationId: conv.id, userId: actor.userId },
      { lastReadAt: new Date() },
    );

    const qb = messageRepo
      .createQueryBuilder("msg")
      .where("msg.conversationId = :conversationId", { conversationId });

    if (query.before) {
      const cursorMessage = await messageRepo.findOne({
        where: { id: query.before, conversationId },
      });
      if (!cursorMessage) {
        throw new AppError(400, "INVALID_CURSOR", "Cursor message not found");
      }
      qb.andWhere("(msg.createdAt < :beforeDate OR (msg.createdAt = :beforeDate AND msg.id < :beforeId))", { beforeDate: cursorMessage.createdAt, beforeId: cursorMessage.id });
    }

    qb.orderBy("msg.createdAt", "DESC").addOrderBy("msg.id", "DESC").take(query.limit + 1);

    const results = await qb.getMany();
    const hasMore = results.length > query.limit;
    const items = hasMore ? results.slice(0, query.limit) : results;

    // Return in chronological order
    const chronologicalItems = items.reverse();
    const nextCursor = hasMore ? items[0]?.id ?? null : null;

    return {
      items: chronologicalItems.map((m) => this.toMessageView(m)),
      nextCursor,
      hasMore,
    };
  }

  async createMessage(
    conversationId: string,
    actor: ActorContext,
    input: CreateMessageInput,
    now: Date,
  ): Promise<{ message: MessageView; isReplay: boolean }> {
    const convRepo = this.dataSource.getRepository(Conversation);
    const messageRepo = this.dataSource.getRepository(Message);
    const entitlementRepo = this.dataSource.getRepository(CommunicationEntitlement);
    const participantRepo = this.dataSource.getRepository(ConversationParticipant);

    const conv = await convRepo.findOne({
      where: { id: conversationId },
      relations: {
        appointment: true, familyMember: true,
        doctorProfile: { user: true },
        patientProfile: { user: true },
        entitlement: true,
      },
    });

    if (!conv) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
    }

    const isAuthorized = (() => { authorizeConversation(conv, actor); return true; })();

    if (!isAuthorized) {
      throw new AppError(
        403,
        "CONVERSATION_FORBIDDEN",
        "You are not authorized to post messages to this conversation",
      );
    }

    // Check idempotency first before evaluating entitlement
    if (input.idempotencyKey) {
      const existing = await messageRepo.findOne({
        where: {
          conversationId,
          idempotencyKey: input.idempotencyKey,
          senderId: actor.userId,
        },
      });
      if (existing) {
        if (existing.content !== input.content) throw new AppError(409, "IDEMPOTENCY_CONFLICT", "Key already used with different content");
        return { message: this.toMessageView(existing), isReplay: true };
      }
    }

    if (!communicationCapabilities(conv, now).canSend) {
      throw new AppError(403, "COMMUNICATION_WINDOW_EXPIRED", "Communication is read-only or outside its permitted window.");
    }

    // Determine senderName
    let senderName: string;
    if (actor.userRole === "DOCTOR") {
      const docUser = conv.doctorProfile?.user;
      senderName = docUser ? `Dr. ${docUser.firstName} ${docUser.lastName}`.trim() : "Dr. Specialist";
    } else {
      const patientUser = conv.patientProfile?.user;
      senderName = patientUser ? `${patientUser.firstName} ${patientUser.lastName}`.trim() : "Patient";
    }

    const result = await this.dataSource.transaction(async (manager) => {
      await manager.findOneOrFail(Conversation, { where: { id: conv.id }, lock: { mode: "pessimistic_write" } });
      const appointment = await manager.findOneOrFail(Appointment, { where: { id: conv.appointmentId }, lock: { mode: "pessimistic_read" } });
      const entitlement = await manager.findOne(CommunicationEntitlement, { where: { conversationId } });
      if (!communicationCapabilities({ ...conv, appointment, entitlement }, now).canSend) {
        throw new AppError(403, "COMMUNICATION_WINDOW_EXPIRED", "Communication is read-only");
      }
      if (input.idempotencyKey) {
        const prior = await manager.findOne(Message, { where: { conversationId, senderId: actor.userId, idempotencyKey: input.idempotencyKey } });
        if (prior) {
          if (prior.content !== input.content) throw new AppError(409, "IDEMPOTENCY_CONFLICT", "Key already used with different content");
          return { saved: prior, replay: true };
        }
      }
      const msg = manager.create(Message, {
        conversationId: conv.id,
        senderId: actor.userId,
        senderRole: actor.userRole,
        senderName,
        content: input.content,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: now,
      });
      const savedMessage = await manager.save(msg);

      await manager.update(
        Conversation,
        { id: conv.id },
        { lastMessageAt: now, updatedAt: now },
      );

      await manager.update(
        ConversationParticipant,
        { conversationId: conv.id, userId: actor.userId },
        { lastReadAt: now },
      );

      return { saved: savedMessage, replay: false };
    });

    return { message: this.toMessageView(result.saved), isReplay: result.replay };
  }

  private toMessageView(msg: Message): MessageView {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderRole: msg.senderRole as "DOCTOR" | "PATIENT",
      senderName: msg.senderName,
      content: msg.content,
      idempotencyKey: msg.idempotencyKey,
      createdAt: msg.createdAt.toISOString(),
    };
  }
}
