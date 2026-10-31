import { describe, expect, it, vi } from "vitest";
import { InAppNotificationService } from "../src/modules/notifications/in-app-notification.service";
import type { InAppNotificationRepository } from "../src/modules/notifications/typeorm-in-app-notification.repository";
import type { InAppNotification } from "../src/modules/notifications/in-app-notification.entity";
import express from "express";
import request from "supertest";
import { createInAppNotificationRouter } from "../src/modules/notifications/in-app-notification.routes";

describe("InAppNotificationService", () => {
  const mockNotification: InAppNotification = {
    id: "notif-uuid-1",
    userId: "user-uuid-1",
    role: "PATIENT",
    type: "PRESCRIPTION",
    title: "New E-Prescription Issued",
    message: "Dr. Anisur Rahman issued prescription #RX-9921.",
    details: "Tab Napa Extra 500mg, 1+0+1 for 5 days.",
    priority: "info",
    isRead: false,
    readAt: null,
    actionUrl: "/prescriptions",
    actionLabel: "View Prescription",
    secondaryActionUrl: "/verify-prescription?code=RX9921",
    secondaryActionLabel: "Verify Code",
    metadata: { prescriptionId: "rx-1" },
    createdAt: new Date("2026-10-31T07:20:00.000Z"),
  };

  it("lists notifications for a user and calculates unread count", async () => {
    const mockRepo: InAppNotificationRepository = {
      findForUser: vi.fn(async () => [mockNotification]),
      countUnreadForUser: vi.fn(async () => 1),
      markAllAsRead: vi.fn(async () => 1),
      markAsRead: vi.fn(async () => true),
      save: vi.fn(async (n) => ({ ...mockNotification, ...n } as InAppNotification)),
    };

    const service = new InAppNotificationService(mockRepo);
    const result = await service.listUserNotifications("user-uuid-1", "PATIENT");

    expect(result.unreadCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("notif-uuid-1");
    expect(result.items[0].type).toBe("PRESCRIPTION");
    expect(result.items[0].actionUrl).toBe("/prescriptions");
  });

  it("marks all notifications as read when popover opens", async () => {
    const mockRepo: InAppNotificationRepository = {
      findForUser: vi.fn(async () => []),
      countUnreadForUser: vi.fn(async () => 0),
      markAllAsRead: vi.fn(async () => 3),
      markAsRead: vi.fn(async () => true),
      save: vi.fn(async (n) => ({ ...mockNotification, ...n } as InAppNotification)),
    };

    const service = new InAppNotificationService(mockRepo);
    const result = await service.markAllAsRead("user-uuid-1");

    expect(result.success).toBe(true);
    expect(result.markedCount).toBe(3);
    expect(mockRepo.markAllAsRead).toHaveBeenCalledWith("user-uuid-1");
  });

  it("marks a single notification as read", async () => {
    const mockRepo: InAppNotificationRepository = {
      findForUser: vi.fn(async () => []),
      countUnreadForUser: vi.fn(async () => 0),
      markAllAsRead: vi.fn(async () => 0),
      markAsRead: vi.fn(async () => true),
      save: vi.fn(async (n) => ({ ...mockNotification, ...n } as InAppNotification)),
    };

    const service = new InAppNotificationService(mockRepo);
    const result = await service.markAsRead("notif-uuid-1", "user-uuid-1");

    expect(result.success).toBe(true);
    expect(mockRepo.markAsRead).toHaveBeenCalledWith("notif-uuid-1", "user-uuid-1");
  });

  it("creates a new in-app notification with role and action routes", async () => {
    const mockRepo: InAppNotificationRepository = {
      findForUser: vi.fn(async () => []),
      countUnreadForUser: vi.fn(async () => 0),
      markAllAsRead: vi.fn(async () => 0),
      markAsRead: vi.fn(async () => true),
      save: vi.fn(async (n) => ({ ...mockNotification, ...n } as InAppNotification)),
    };

    const service = new InAppNotificationService(mockRepo);
    const created = await service.create({
      userId: "user-uuid-1",
      role: "PATIENT",
      type: "PAYMENT",
      title: "Payment Received",
      message: "bKash payment of ৳800 confirmed.",
      actionUrl: "/appointments",
      actionLabel: "View Receipt",
    });

    expect(created.type).toBe("PAYMENT");
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it("handles HTTP routes: GET /, POST /mark-read, and PATCH /:id/read", async () => {
    const mockRepo: InAppNotificationRepository = {
      findForUser: vi.fn(async () => [mockNotification]),
      countUnreadForUser: vi.fn(async () => 1),
      markAllAsRead: vi.fn(async () => 1),
      markAsRead: vi.fn(async () => true),
      save: vi.fn(async (n) => ({ ...mockNotification, ...n } as InAppNotification)),
    };

    const service = new InAppNotificationService(mockRepo);
    const authMiddleware = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.locals.authUser = { id: "user-uuid-1", roles: ["PATIENT"] };
      next();
    };

    const app = express();
    app.use(express.json());
    app.use("/api/v1/notifications", createInAppNotificationRouter(service, authMiddleware));

    // GET /api/v1/notifications
    const getRes = await request(app).get("/api/v1/notifications");
    expect(getRes.status).toBe(200);
    expect(getRes.body.unreadCount).toBe(1);
    expect(getRes.body.items).toHaveLength(1);

    // POST /api/v1/notifications/mark-read
    const postRes = await request(app).post("/api/v1/notifications/mark-read");
    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);

    // PATCH /api/v1/notifications/:id/read
    const patchRes = await request(app).patch("/api/v1/notifications/notif-uuid-1/read");
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
  });
});
