/**
 * API client methods for In-App Notifications.
 * Communicates with backend endpoints:
 * - GET   /api/v1/notifications
 * - POST  /api/v1/notifications/mark-read
 * - PATCH /api/v1/notifications/:id/read
 */

import { request } from "../../api/client";
import type { InAppNotification } from "../types";

export interface ListNotificationsApiResponse {
  items: InAppNotification[];
  unreadCount: number;
}

export interface MarkAllReadApiResponse {
  success: boolean;
  markedCount: number;
}

export interface MarkSingleReadApiResponse {
  success: boolean;
}

export async function fetchUserNotifications(): Promise<ListNotificationsApiResponse> {
  return request<ListNotificationsApiResponse>("/notifications");
}

export async function markAllUserNotificationsRead(): Promise<MarkAllReadApiResponse> {
  return request<MarkAllReadApiResponse>("/notifications/mark-read", {
    method: "POST",
  });
}

export async function markSingleNotificationRead(id: string): Promise<MarkSingleReadApiResponse> {
  return request<MarkSingleReadApiResponse>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}
