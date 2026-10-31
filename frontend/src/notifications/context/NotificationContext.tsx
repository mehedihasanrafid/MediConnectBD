/**
 * Global Notification Context & Provider for MediConnect BD.
 * Supports:
 * - Automatic mark-all-as-read when notification popover opens
 * - Unread count badge state that clears to none when seen
 * - Persona switching (Patient, Doctor, Admin)
 * - Persistent notification history
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchUserNotifications,
  markAllUserNotificationsRead,
  markSingleNotificationRead,
} from "../api/notificationsApi";
import { getDemoNotificationsForRole } from "../data/demoNotifications";
import type { InAppNotification } from "../types";

interface NotificationContextValue {
  notifications: InAppNotification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const activeRole = user?.roles?.[0] || "PATIENT";

  const [notifications, setNotifications] = useState<InAppNotification[]>(() =>
    getDemoNotificationsForRole(activeRole),
  );
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const initial = getDemoNotificationsForRole(activeRole);
    return initial.filter((n) => !n.isRead).length;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        const response = await fetchUserNotifications();
        if (response?.items && response.items.length > 0) {
          setNotifications(response.items);
          setUnreadCount(response.unreadCount ?? 0);
          return;
        }
      }
      // Fallback to role-tailored demo items if unauthenticated or empty
      const demoItems = getDemoNotificationsForRole(activeRole);
      setNotifications(demoItems);
      setUnreadCount(demoItems.filter((n) => !n.isRead).length);
    } catch {
      // Graceful fallback on network failure
      const demoItems = getDemoNotificationsForRole(activeRole);
      setNotifications(demoItems);
      setUnreadCount(demoItems.filter((n) => !n.isRead).length);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeRole]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  /**
   * Automatically triggered when notification popover opens.
   * Immediately clears the unread badge to 0 and syncs with backend.
   */
  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;

    // Optimistic UI update: instantly clear badge count to none and mark items read
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((item) =>
        item.isRead ? item : { ...item, isRead: true, readAt: new Date().toISOString() },
      ),
    );

    try {
      if (user) {
        await markAllUserNotificationsRead();
      }
    } catch {
      // Keep optimistic UI intact
    }
  }, [unreadCount, user]);

  /**
   * Marks a specific notification as read upon click/action.
   */
  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((item) => {
          if (item.id === id && !item.isRead) {
            setUnreadCount((count) => Math.max(0, count - 1));
            return { ...item, isRead: true, readAt: new Date().toISOString() };
          }
          return item;
        }),
      );

      try {
        if (user) {
          await markSingleNotificationRead(id);
        }
      } catch {
        // Keep optimistic update
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      refreshNotifications,
      markAllAsRead,
      markAsRead,
    }),
    [notifications, unreadCount, isLoading, refreshNotifications, markAllAsRead, markAsRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

const defaultNotificationContext: NotificationContextValue = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  refreshNotifications: async () => {},
  markAllAsRead: async () => {},
  markAsRead: async () => {},
};

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    return defaultNotificationContext;
  }
  return context;
}
