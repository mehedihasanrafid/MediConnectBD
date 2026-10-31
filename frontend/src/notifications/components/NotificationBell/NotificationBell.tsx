/**
 * Header Notification Bell with unread counter badge and elevated popover tray.
 * Features:
 * - Automatically marks notifications as read when opened (badge clears to none)
 * - Exact Bangladesh standard date & time (Asia/Dhaka)
 * - Deep linking to Prescriptions, Appointments, Video Hub, Receipts, and Admin
 * - History preserved even when all notifications are seen
 * - Dedicated link to full Notification Center (/notifications)
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  MessageSquare,
  ShieldAlert,
  Video,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../../shared/ui/DropdownMenu";
import { useAuth } from "../../../features/auth/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { formatDhakaNotificationTime } from "../../utils/dateFormatter";
import type { InAppNotification, InAppNotificationType } from "../../types";
import styles from "./NotificationBell.module.css";

function getCategoryIcon(type: InAppNotificationType) {
  switch (type) {
    case "PRESCRIPTION":
      return <FileText size={14} aria-hidden="true" />;
    case "PAYMENT":
      return <CreditCard size={14} aria-hidden="true" />;
    case "APPOINTMENT":
      return <Calendar size={14} aria-hidden="true" />;
    case "CALL":
      return <Video size={14} aria-hidden="true" />;
    case "COMMUNICATION":
      return <MessageSquare size={14} aria-hidden="true" />;
    case "SYSTEM":
    default:
      return <ShieldAlert size={14} aria-hidden="true" />;
  }
}

function getCategoryBadgeClass(type: InAppNotificationType) {
  switch (type) {
    case "PRESCRIPTION":
      return styles.badgePrescription;
    case "PAYMENT":
      return styles.badgePayment;
    case "APPOINTMENT":
      return styles.badgeAppointment;
    case "CALL":
      return styles.badgeCall;
    case "COMMUNICATION":
      return styles.badgeCommunication;
    case "SYSTEM":
    default:
      return styles.badgeSystem;
  }
}

function getCategoryLabel(type: InAppNotificationType) {
  switch (type) {
    case "PRESCRIPTION":
      return "Prescription";
    case "PAYMENT":
      return "Payment";
    case "APPOINTMENT":
      return "Appointment";
    case "CALL":
      return "Telehealth Call";
    case "COMMUNICATION":
      return "Message";
    case "SYSTEM":
    default:
      return "System Notice";
  }
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const activeRole = user?.roles?.[0] || "PATIENT";

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Automatically mark all notifications as read and clear the counter
      void markAllAsRead();
    }
  };

  const handleItemClick = (notification: InAppNotification) => {
    void markAsRead(notification.id);
    setIsOpen(false);
  };

  return (
    <div className={styles.bellWrapper}>
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={clsx(styles.bellButton, isOpen && styles.bellButtonActive)}
            aria-label={`Notifications (${unreadCount} unread)`}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className={styles.badge} aria-label={`${unreadCount} unread`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className={styles.popoverContent}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.headerTitle}>Notifications</span>
              <span className={styles.roleTag}>{activeRole}</span>
            </div>
            <span className={styles.headerStatus}>
              {notifications.length} total
            </span>
          </div>

          {/* Notifications List */}
          <div className={styles.notificationList}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <CheckCircle2 size={28} className={styles.emptyIcon} aria-hidden="true" />
                <span className={styles.emptyTitle}>All caught up!</span>
                <span className={styles.emptyMessage}>
                  No active notifications right now.
                </span>
              </div>
            ) : (
              notifications.slice(0, 8).map((item) => {
                const exactDhakaTime = formatDhakaNotificationTime(item.createdAt);

                return (
                  <div
                    key={item.id}
                    className={clsx(
                      styles.notificationItem,
                      !item.isRead && styles.unreadItem,
                    )}
                  >
                    {/* Top Row: Category badge & Bangladesh timestamp */}
                    <div className={styles.itemTop}>
                      <div className={styles.categoryGroup}>
                        <span className={styles.categoryIconWrap}>
                          {getCategoryIcon(item.type)}
                        </span>
                        <span
                          className={clsx(
                            styles.categoryBadge,
                            getCategoryBadgeClass(item.type),
                          )}
                        >
                          {getCategoryLabel(item.type)}
                        </span>
                      </div>
                      <span
                        className={styles.timestamp}
                        title={`Dhaka Time: ${exactDhakaTime}`}
                      >
                        {exactDhakaTime}
                      </span>
                    </div>

                    {/* Content */}
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{item.title}</div>
                      <div className={styles.itemMessage}>{item.message}</div>
                    </div>

                    {/* Deep Link Actions */}
                    <div className={styles.itemActions}>
                      <Link
                        to={item.actionUrl}
                        className={styles.actionButton}
                        onClick={() => handleItemClick(item)}
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>

                      {item.secondaryActionUrl && item.secondaryActionLabel && (
                        <Link
                          to={item.secondaryActionUrl}
                          className={styles.secondaryLink}
                          onClick={() => handleItemClick(item)}
                        >
                          <span>{item.secondaryActionLabel}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer linking to full page */}
          <div className={styles.footer}>
            <Link
              to="/notifications"
              className={styles.footerLink}
              onClick={() => setIsOpen(false)}
            >
              <span>View all in Notification Center</span>
              <ExternalLink size={13} aria-hidden="true" />
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
