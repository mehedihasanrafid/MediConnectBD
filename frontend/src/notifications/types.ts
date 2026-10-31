/**
 * Type definitions for MediConnect BD In-App Notification System.
 * Supports role-differentiated alerts with exact Asia/Dhaka timestamps
 * and 1-click deep linking actions.
 */

export type InAppNotificationType =
  | "PRESCRIPTION"
  | "PAYMENT"
  | "COMMUNICATION"
  | "CALL"
  | "APPOINTMENT"
  | "SYSTEM";

export type InAppNotificationPriority = "info" | "success" | "warning" | "urgent";

export interface InAppNotification {
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
  secondaryActionUrl?: string | null;
  secondaryActionLabel?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export type NotificationCategoryFilter =
  | "ALL"
  | "PRESCRIPTION"
  | "APPOINTMENT_CALL"
  | "PAYMENT"
  | "COMMUNICATION"
  | "SYSTEM";
