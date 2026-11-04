import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { AppError } from "../src/utils/app-error";
import { CommunicationService } from "../src/modules/communication/communication.service";
import { createCommunicationRouter } from "../src/modules/communication/communication.routes";
import type { CommunicationRepository } from "../src/modules/communication/communication.repository";
import type {
  ActorContext,
  ConversationDetailView,
  ConversationSummaryView,
  CreateMessageInput,
  MessageView,
  PaginatedMessagesView,
} from "../src/modules/communication/communication.types";
import { ConversationStatus } from "../src/modules/communication/conversation.entity";

describe("CommunicationService & API Endpoints", () => {
  const doctorActor: ActorContext = {
    userId: "doctor-user-uuid-1",
    userRole: "DOCTOR",
    doctorProfileId: "doctor-profile-uuid-1",
    userName: "Dr. Sarah Ahmed",
  };

  const patientActor: ActorContext = {
    userId: "patient-user-uuid-1",
    userRole: "PATIENT",
    patientProfileId: "patient-profile-uuid-1",
    userName: "Tanvir Hasan",
  };

  const mockSummary: ConversationSummaryView = {
    id: "e5a3297a-6b45-4291-a275-c9a174c83e10",
    appointmentId: "12345678-1234-4291-a275-c9a174c83e11",
    appointmentMode: "VIDEO",
    appointmentStatus: "CONFIRMED",
    status: ConversationStatus.ACTIVE,
    participant: {
      userId: "doctor-user-uuid-1",
      role: "DOCTOR",
      name: "Dr. Sarah Ahmed",
      subtitle: "Cardiology · BMDC #A-54321",
      avatarUrl: "https://example.com/photo.jpg",
    },
    beneficiary: {
      id: "ben-uuid-1",
      name: "Kabir Hasan",
      relationship: "Father",
    },
    entitlement: {
      windowStartsAt: "2026-11-01T10:00:00.000Z",
      windowExpiresAt: "2026-11-08T10:00:00.000Z",
      isExpired: false,
      daysRemaining: 5,
      isExtended: false,
    },
    lastMessage: {
      id: "msg-uuid-1",
      conversationId: "e5a3297a-6b45-4291-a275-c9a174c83e10",
      senderId: "doctor-user-uuid-1",
      senderRole: "DOCTOR",
      senderName: "Dr. Sarah Ahmed",
      content: "Please take your medications as directed.",
      idempotencyKey: null,
      createdAt: "2026-11-03T08:00:00.000Z",
    },
    unreadCount: 1,
    updatedAt: "2026-11-03T08:00:00.000Z",
  };

  const mockDetail: ConversationDetailView = {
    id: "e5a3297a-6b45-4291-a275-c9a174c83e10",
    appointmentId: "12345678-1234-4291-a275-c9a174c83e11",
    appointmentMode: "VIDEO",
    appointmentStatus: "CONFIRMED",
    scheduledStartAt: "2026-11-01T10:00:00.000Z",
    scheduledEndAt: "2026-11-01T10:30:00.000Z",
    status: ConversationStatus.ACTIVE,
    doctor: {
      profileId: "doctor-profile-uuid-1",
      userId: "doctor-user-uuid-1",
      name: "Dr. Sarah Ahmed",
      specialty: "Cardiology",
      hospital: "Square Hospital",
      avatarUrl: "https://example.com/photo.jpg",
    },
    patient: {
      profileId: "patient-profile-uuid-1",
      userId: "patient-user-uuid-1",
      name: "Tanvir Hasan",
    },
    beneficiary: {
      id: "ben-uuid-1",
      name: "Kabir Hasan",
      relationship: "Father",
    },
    entitlement: {
      windowStartsAt: "2026-11-01T10:00:00.000Z",
      windowExpiresAt: "2026-11-08T10:00:00.000Z",
      isExpired: false,
      daysRemaining: 5,
      isExtended: false,
    },
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-03T08:00:00.000Z",
  };

  it("lists conversations for authenticated user", async () => {
    const mockRepo: CommunicationRepository = {
      syncEligibleConversations: vi.fn(async () => undefined),
      listConversations: vi.fn(async () => [mockSummary]),
      getConversationById: vi.fn(async () => mockDetail),
      listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
      createMessage: vi.fn(async () => ({
        message: mockSummary.lastMessage!,
        isReplay: false,
      })),
    };

    const service = new CommunicationService(mockRepo);
    const result = await service.listConversations(patientActor);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e5a3297a-6b45-4291-a275-c9a174c83e10");
    expect(result[0].participant.role).toBe("DOCTOR");
    expect(result[0].beneficiary?.name).toBe("Kabir Hasan");
    expect(result[0].entitlement.isExpired).toBe(false);
  });

  it("returns conversation detail when actor is authorized", async () => {
    const mockRepo: CommunicationRepository = {
      syncEligibleConversations: vi.fn(async () => undefined),
      listConversations: vi.fn(async () => []),
      getConversationById: vi.fn(async () => mockDetail),
      listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
      createMessage: vi.fn(async () => ({
        message: mockSummary.lastMessage!,
        isReplay: false,
      })),
    };

    const service = new CommunicationService(mockRepo);
    const result = await service.getConversation("e5a3297a-6b45-4291-a275-c9a174c83e10", patientActor);

    expect(result.id).toBe("e5a3297a-6b45-4291-a275-c9a174c83e10");
    expect(result.doctor.name).toBe("Dr. Sarah Ahmed");
    expect(result.patient.name).toBe("Tanvir Hasan");
  });

  it("throws 404 when conversation does not exist", async () => {
    const mockRepo: CommunicationRepository = {
      syncEligibleConversations: vi.fn(async () => undefined),
      listConversations: vi.fn(async () => []),
      getConversationById: vi.fn(async () => null),
      listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
      createMessage: vi.fn(async () => ({
        message: mockSummary.lastMessage!,
        isReplay: false,
      })),
    };

    const service = new CommunicationService(mockRepo);
    await expect(
      service.getConversation("00000000-0000-0000-0000-000000000000", patientActor),
    ).rejects.toThrow("Conversation was not found");
  });

  it("enforces strict actor authorization (forbidden access)", async () => {
    const mockRepo: CommunicationRepository = {
      syncEligibleConversations: vi.fn(async () => undefined),
      listConversations: vi.fn(async () => []),
      getConversationById: vi.fn(async () => {
        throw new AppError(403, "CONVERSATION_FORBIDDEN", "Forbidden");
      }),
      listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
      createMessage: vi.fn(async () => {
        throw new AppError(403, "CONVERSATION_FORBIDDEN", "Forbidden");
      }),
    };

    const service = new CommunicationService(mockRepo);
    await expect(
      service.getConversation("e5a3297a-6b45-4291-a275-c9a174c83e10", {
        userId: "unrelated-user",
        userRole: "PATIENT",
        patientProfileId: "unrelated-patient-profile",
      }),
    ).rejects.toThrow("Forbidden");
  });

  it("enforces 7-day post-completion follow-up window expiration", async () => {
    const expiredCutoff = new Date("2026-11-20T12:00:00.000Z");
    const mockRepo: CommunicationRepository = {
      syncEligibleConversations: vi.fn(async () => undefined),
      listConversations: vi.fn(async () => []),
      getConversationById: vi.fn(async () => ({
        ...mockDetail,
        status: ConversationStatus.EXPIRED,
        entitlement: {
          ...mockDetail.entitlement,
          isExpired: true,
          daysRemaining: 0,
        },
      })),
      listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
      createMessage: vi.fn(async (_convId, _actor, _input, now) => {
        if (now > new Date("2026-11-08T10:00:00.000Z")) {
          throw new AppError(
            403,
            "COMMUNICATION_WINDOW_EXPIRED",
            "The 7-day follow-up consultation window has closed.",
          );
        }
        return { message: mockSummary.lastMessage!, isReplay: false };
      }),
    };

    const service = new CommunicationService(mockRepo, () => expiredCutoff);

    // Reading detail remains allowed (for clinical review)
    const detail = await service.getConversation("e5a3297a-6b45-4291-a275-c9a174c83e10", patientActor);
    expect(detail.status).toBe(ConversationStatus.EXPIRED);
    expect(detail.entitlement.isExpired).toBe(true);

    // Sending message throws 403
    await expect(
      service.sendMessage("e5a3297a-6b45-4291-a275-c9a174c83e10", patientActor, {
        content: "Hello doctor, is it expired?",
      }),
    ).rejects.toThrow("The 7-day follow-up consultation window has closed.");
  });

  it("deduplicates message creation with idempotency key", async () => {
    const existingMessage: MessageView = {
      id: "msg-idempotent-1",
      conversationId: "e5a3297a-6b45-4291-a275-c9a174c83e10",
      senderId: patientActor.userId,
      senderRole: "PATIENT",
      senderName: patientActor.userName!,
      content: "Hello doctor!",
      idempotencyKey: "client-req-001",
      createdAt: "2026-11-03T09:00:00.000Z",
    };

    let callCount = 0;
    const mockRepo: CommunicationRepository = {
      syncEligibleConversations: vi.fn(async () => undefined),
      listConversations: vi.fn(async () => []),
      getConversationById: vi.fn(async () => mockDetail),
      listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
      createMessage: vi.fn(async (_c, _a, input) => {
        callCount++;
        if (callCount > 1 && input.idempotencyKey === "client-req-001") {
          return { message: existingMessage, isReplay: true };
        }
        return { message: existingMessage, isReplay: false };
      }),
    };

    const service = new CommunicationService(mockRepo);

    // First attempt creates message
    const first = await service.sendMessage("e5a3297a-6b45-4291-a275-c9a174c83e10", patientActor, {
      content: "Hello doctor!",
      idempotencyKey: "client-req-001",
    });
    expect(first.isReplay).toBe(false);
    expect(first.message.id).toBe("msg-idempotent-1");

    // Second attempt replays without error
    const second = await service.sendMessage("e5a3297a-6b45-4291-a275-c9a174c83e10", patientActor, {
      content: "Hello doctor!",
      idempotencyKey: "client-req-001",
    });
    expect(second.isReplay).toBe(true);
    expect(second.message.id).toBe("msg-idempotent-1");
  });

  it("returns cursor-paginated messages in chronological order", async () => {
    const paginatedView: PaginatedMessagesView = {
      items: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          conversationId: "e5a3297a-6b45-4291-a275-c9a174c83e10",
          senderId: patientActor.userId,
          senderRole: "PATIENT",
          senderName: "Tanvir Hasan",
          content: "First message",
          idempotencyKey: null,
          createdAt: "2026-11-03T07:00:00.000Z",
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          conversationId: "e5a3297a-6b45-4291-a275-c9a174c83e10",
          senderId: doctorActor.userId,
          senderRole: "DOCTOR",
          senderName: "Dr. Sarah Ahmed",
          content: "Second message",
          idempotencyKey: null,
          createdAt: "2026-11-03T07:05:00.000Z",
        },
      ],
      nextCursor: "33333333-3333-4333-8333-333333333333",
      hasMore: true,
    };

    const mockRepo: CommunicationRepository = {
      syncEligibleConversations: vi.fn(async () => undefined),
      listConversations: vi.fn(async () => []),
      getConversationById: vi.fn(async () => mockDetail),
      listMessages: vi.fn(async () => paginatedView),
      createMessage: vi.fn(async () => ({
        message: mockSummary.lastMessage!,
        isReplay: false,
      })),
    };

    const service = new CommunicationService(mockRepo);
    const result = await service.listMessages("e5a3297a-6b45-4291-a275-c9a174c83e10", patientActor, {
      limit: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("33333333-3333-4333-8333-333333333333");
  });

  describe("HTTP Router Endpoints", () => {
    function createTestApp(service: CommunicationService, actorRole: "PATIENT" | "DOCTOR" = "PATIENT") {
      const app = express();
      app.use(express.json());

      const authenticate = (req: any, res: any, next: any) => {
        res.locals.authUser = {
          id: actorRole === "DOCTOR" ? doctorActor.userId : patientActor.userId,
          email: "user@example.com",
          firstName: actorRole === "DOCTOR" ? "Sarah" : "Tanvir",
          lastName: actorRole === "DOCTOR" ? "Ahmed" : "Hasan",
          roles: [actorRole],
          patientProfileId: actorRole === "PATIENT" ? patientActor.patientProfileId : null,
          doctorProfile: actorRole === "DOCTOR" ? { id: doctorActor.doctorProfileId } : null,
        };
        next();
      };

      app.use("/api/v1/communication", createCommunicationRouter(service, authenticate));
      return app;
    }

    it("GET /api/v1/communication/conversations returns 200 with list", async () => {
      const mockRepo: CommunicationRepository = {
        syncEligibleConversations: vi.fn(async () => undefined),
        listConversations: vi.fn(async () => [mockSummary]),
        getConversationById: vi.fn(async () => mockDetail),
        listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
        createMessage: vi.fn(async () => ({
          message: mockSummary.lastMessage!,
          isReplay: false,
        })),
      };

      const app = createTestApp(new CommunicationService(mockRepo));
      const res = await request(app).get("/api/v1/communication/conversations");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe("e5a3297a-6b45-4291-a275-c9a174c83e10");
    });

    it("GET /api/v1/communication/conversations/:id returns 200 with detail", async () => {
      const mockRepo: CommunicationRepository = {
        syncEligibleConversations: vi.fn(async () => undefined),
        listConversations: vi.fn(async () => []),
        getConversationById: vi.fn(async () => mockDetail),
        listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
        createMessage: vi.fn(async () => ({
          message: mockSummary.lastMessage!,
          isReplay: false,
        })),
      };

      const app = createTestApp(new CommunicationService(mockRepo));
      const res = await request(app).get(
        "/api/v1/communication/conversations/e5a3297a-6b45-4291-a275-c9a174c83e10",
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("e5a3297a-6b45-4291-a275-c9a174c83e10");
      expect(res.body.doctor.name).toBe("Dr. Sarah Ahmed");
    });

    it("POST /api/v1/communication/conversations/:id/messages returns 201 on new message", async () => {
      const createdMessage: MessageView = {
        id: "new-msg-123",
        conversationId: "e5a3297a-6b45-4291-a275-c9a174c83e10",
        senderId: patientActor.userId,
        senderRole: "PATIENT",
        senderName: "Tanvir Hasan",
        content: "Doctor, I received my blood test report.",
        idempotencyKey: "test-idem-1",
        createdAt: "2026-11-03T10:00:00.000Z",
      };

      const mockRepo: CommunicationRepository = {
        syncEligibleConversations: vi.fn(async () => undefined),
        listConversations: vi.fn(async () => []),
        getConversationById: vi.fn(async () => mockDetail),
        listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
        createMessage: vi.fn(async () => ({
          message: createdMessage,
          isReplay: false,
        })),
      };

      const app = createTestApp(new CommunicationService(mockRepo));
      const res = await request(app)
        .post("/api/v1/communication/conversations/e5a3297a-6b45-4291-a275-c9a174c83e10/messages")
        .send({
          content: "Doctor, I received my blood test report.",
          idempotencyKey: "test-idem-1",
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("new-msg-123");
      expect(res.body.content).toBe("Doctor, I received my blood test report.");
    });

    it("POST /api/v1/communication/conversations/:id/messages returns 200 on idempotent replay", async () => {
      const existingMessage: MessageView = {
        id: "replayed-msg-123",
        conversationId: "e5a3297a-6b45-4291-a275-c9a174c83e10",
        senderId: patientActor.userId,
        senderRole: "PATIENT",
        senderName: "Tanvir Hasan",
        content: "Duplicate message",
        idempotencyKey: "test-idem-2",
        createdAt: "2026-11-03T10:00:00.000Z",
      };

      const mockRepo: CommunicationRepository = {
        syncEligibleConversations: vi.fn(async () => undefined),
        listConversations: vi.fn(async () => []),
        getConversationById: vi.fn(async () => mockDetail),
        listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
        createMessage: vi.fn(async () => ({
          message: existingMessage,
          isReplay: true,
        })),
      };

      const app = createTestApp(new CommunicationService(mockRepo));
      const res = await request(app)
        .post("/api/v1/communication/conversations/e5a3297a-6b45-4291-a275-c9a174c83e10/messages")
        .send({
          content: "Duplicate message",
          idempotencyKey: "test-idem-2",
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("replayed-msg-123");
    });

    it("GET /api/v1/communication/conversations/:id/messages returns 200 with cursor pagination", async () => {
      const paginatedView: PaginatedMessagesView = {
        items: [
          {
            id: "msg-cur-1",
            conversationId: "e5a3297a-6b45-4291-a275-c9a174c83e10",
            senderId: doctorActor.userId,
            senderRole: "DOCTOR",
            senderName: "Dr. Sarah Ahmed",
            content: "Take care and drink plenty of water.",
            idempotencyKey: null,
            createdAt: "2026-11-03T09:30:00.000Z",
          },
        ],
        nextCursor: null,
        hasMore: false,
      };

      const mockRepo: CommunicationRepository = {
        syncEligibleConversations: vi.fn(async () => undefined),
        listConversations: vi.fn(async () => []),
        getConversationById: vi.fn(async () => mockDetail),
        listMessages: vi.fn(async () => paginatedView),
        createMessage: vi.fn(async () => ({
          message: mockSummary.lastMessage!,
          isReplay: false,
        })),
      };

      const app = createTestApp(new CommunicationService(mockRepo));
      const res = await request(app).get(
        "/api/v1/communication/conversations/e5a3297a-6b45-4291-a275-c9a174c83e10/messages?limit=10",
      );

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe("msg-cur-1");
      expect(res.body.hasMore).toBe(false);
      expect(res.body.nextCursor).toBeNull();
    });

    it("rejects unauthorized role access with 403", async () => {
      const mockRepo: CommunicationRepository = {
        syncEligibleConversations: vi.fn(async () => undefined),
        listConversations: vi.fn(async () => []),
        getConversationById: vi.fn(async () => mockDetail),
        listMessages: vi.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
        createMessage: vi.fn(async () => ({
          message: mockSummary.lastMessage!,
          isReplay: false,
        })),
      };

      // Admin role (neither DOCTOR nor PATIENT)
      const app = createTestApp(new CommunicationService(mockRepo), "ADMIN" as any);
      const res = await request(app).get("/api/v1/communication/conversations");

      expect(res.status).toBe(403);
    });
  });
});
