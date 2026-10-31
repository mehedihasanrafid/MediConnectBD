/**
 * In-App Notification Service for patients, doctors, and administrators.
 * Manages auditable clinical notifications, automatic mark-all-as-read on open,
 * and role-specific notifications with exact Asia/Dhaka timestamps.
 */

import type { InAppNotificationRepository } from "./typeorm-in-app-notification.repository";
import type { InAppNotification, InAppNotificationPriority, InAppNotificationType } from "./in-app-notification.entity";

export interface CreateInAppNotificationInput {
  userId: string;
  role?: string;
  type: InAppNotificationType;
  title: string;
  message: string;
  details?: string;
  priority?: InAppNotificationPriority;
  actionUrl: string;
  actionLabel: string;
  secondaryActionUrl?: string;
  secondaryActionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface InAppNotificationView {
  id: string;
  userId: string;
  role: string;
  type: InAppNotificationType;
  title: string;
  message: string;
  details: string | null;
  priority: InAppNotificationPriority;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string;
  actionLabel: string;
  secondaryActionUrl: string | null;
  secondaryActionLabel: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListNotificationsResult {
  items: InAppNotificationView[];
  unreadCount: number;
}

export class InAppNotificationService {
  constructor(private readonly repository: InAppNotificationRepository) {}

  async listUserNotifications(userId: string, userRole?: string): Promise<ListNotificationsResult> {
    const rawItems = await this.repository.findForUser(userId);
    const unreadCount = await this.repository.countUnreadForUser(userId);

    const items: InAppNotificationView[] = rawItems.map((item) => ({
      id: item.id,
      userId: item.userId,
      role: item.role,
      type: item.type,
      title: item.title,
      message: item.message,
      details: item.details,
      priority: item.priority,
      isRead: item.isRead,
      readAt: item.readAt ? item.readAt.toISOString() : null,
      actionUrl: item.actionUrl,
      actionLabel: item.actionLabel,
      secondaryActionUrl: item.secondaryActionUrl,
      secondaryActionLabel: item.secondaryActionLabel,
      metadata: item.metadata,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      items,
      unreadCount,
    };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; markedCount: number }> {
    const markedCount = await this.repository.markAllAsRead(userId);
    return {
      success: true,
      markedCount,
    };
  }

  async markAsRead(id: string, userId: string): Promise<{ success: boolean }> {
    const success = await this.repository.markAsRead(id, userId);
    return {
      success,
    };
  }

  async create(input: CreateInAppNotificationInput): Promise<InAppNotification> {
    return this.repository.save({
      userId: input.userId,
      role: input.role || "ALL",
      type: input.type,
      title: input.title,
      message: input.message,
      details: input.details ?? null,
      priority: input.priority || "info",
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      secondaryActionUrl: input.secondaryActionUrl ?? null,
      secondaryActionLabel: input.secondaryActionLabel ?? null,
      metadata: input.metadata ?? null,
      isRead: false,
    });
  }
}
