/**
 * Comprehensive In-App Notification Center Page (/notifications).
 * Provides:
 * - Search by keyword/medicine/doctor/complaint/reference
 * - Category filter pills (Prescriptions, Appointments & Calls, Payments, Messages, System)
 * - Exact Bangladesh timestamp for every notification (Asia/Dhaka)
 * - Deep linking to Prescriptions, Appointment receipts, Video Hub, and Admin
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  FileText,
  MessageSquare,
  Search,
  ShieldAlert,
  Video,
} from "lucide-react";
import { useAuth } from "../../../features/auth/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { formatDhakaNotificationTime } from "../../utils/dateFormatter";
import type {
  InAppNotificationType,
  NotificationCategoryFilter,
} from "../../types";
import styles from "./NotificationsPage.module.css";

function getCategoryIcon(type: InAppNotificationType) {
  switch (type) {
    case "PRESCRIPTION":
      return <FileText size={16} aria-hidden="true" />;
    case "PAYMENT":
      return <CreditCard size={16} aria-hidden="true" />;
    case "APPOINTMENT":
      return <Calendar size={16} aria-hidden="true" />;
    case "CALL":
      return <Video size={16} aria-hidden="true" />;
    case "COMMUNICATION":
      return <MessageSquare size={16} aria-hidden="true" />;
    case "SYSTEM":
    default:
      return <ShieldAlert size={16} aria-hidden="true" />;
  }
}

function getPriorityBadgeClass(priority: string) {
  switch (priority) {
    case "urgent":
      return styles.priorityUrgent;
    case "warning":
      return styles.priorityWarning;
    case "success":
      return styles.prioritySuccess;
    case "info":
    default:
      return styles.priorityInfo;
  }
}

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();

  const [activeTab, setActiveTab] = useState<NotificationCategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const activeRole = user?.roles?.[0] || "PATIENT";

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter notifications by category and search term
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Category match
      let matchesCategory = true;
      if (activeTab === "PRESCRIPTION") {
        matchesCategory = item.type === "PRESCRIPTION";
      } else if (activeTab === "APPOINTMENT_CALL") {
        matchesCategory = item.type === "APPOINTMENT" || item.type === "CALL";
      } else if (activeTab === "PAYMENT") {
        matchesCategory = item.type === "PAYMENT";
      } else if (activeTab === "COMMUNICATION") {
        matchesCategory = item.type === "COMMUNICATION";
      } else if (activeTab === "SYSTEM") {
        matchesCategory = item.type === "SYSTEM";
      }

      if (!matchesCategory) return false;

      // Search match
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query) ||
        (item.details && item.details.toLowerCase().includes(query)) ||
        item.actionLabel.toLowerCase().includes(query)
      );
    });
  }, [notifications, activeTab, searchQuery]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      ALL: notifications.length,
      PRESCRIPTION: notifications.filter((n) => n.type === "PRESCRIPTION").length,
      APPOINTMENT_CALL: notifications.filter(
        (n) => n.type === "APPOINTMENT" || n.type === "CALL",
      ).length,
      PAYMENT: notifications.filter((n) => n.type === "PAYMENT").length,
      COMMUNICATION: notifications.filter((n) => n.type === "COMMUNICATION").length,
      SYSTEM: notifications.filter((n) => n.type === "SYSTEM").length,
    };
  }, [notifications]);

  return (
    <div className={styles.pageContainer}>
      {/* Top Banner Card */}
      <div className={styles.headerCard}>
        <div className={styles.titleRow}>
          <div className={styles.titleArea}>
            <div className={styles.titleIconWrap}>
              <Bell size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 className={styles.pageTitle}>Notification Center</h1>
              <p className={styles.pageSubtitle}>
                Clinical updates, appointment confirmations, payments, and system alerts
              </p>
            </div>
          </div>
          <span className={styles.roleTag}>{activeRole} Portal</span>
        </div>

        {/* Filter Tabs and Search Bar */}
        <div className={styles.controlsBar}>
          {/* Category Tabs */}
          <div className={styles.tabList} role="tablist" aria-label="Notification categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "ALL"}
              className={clsx(styles.tabButton, activeTab === "ALL" && styles.tabButtonActive)}
              onClick={() => setActiveTab("ALL")}
            >
              <span>All</span>
              <span className={styles.tabCount}>{counts.ALL}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "PRESCRIPTION"}
              className={clsx(
                styles.tabButton,
                activeTab === "PRESCRIPTION" && styles.tabButtonActive,
              )}
              onClick={() => setActiveTab("PRESCRIPTION")}
            >
              <span>Prescriptions</span>
              <span className={styles.tabCount}>{counts.PRESCRIPTION}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "APPOINTMENT_CALL"}
              className={clsx(
                styles.tabButton,
                activeTab === "APPOINTMENT_CALL" && styles.tabButtonActive,
              )}
              onClick={() => setActiveTab("APPOINTMENT_CALL")}
            >
              <span>Appointments & Calls</span>
              <span className={styles.tabCount}>{counts.APPOINTMENT_CALL}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "PAYMENT"}
              className={clsx(
                styles.tabButton,
                activeTab === "PAYMENT" && styles.tabButtonActive,
              )}
              onClick={() => setActiveTab("PAYMENT")}
            >
              <span>Payments</span>
              <span className={styles.tabCount}>{counts.PAYMENT}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "COMMUNICATION"}
              className={clsx(
                styles.tabButton,
                activeTab === "COMMUNICATION" && styles.tabButtonActive,
              )}
              onClick={() => setActiveTab("COMMUNICATION")}
            >
              <span>Messages</span>
              <span className={styles.tabCount}>{counts.COMMUNICATION}</span>
            </button>

            {counts.SYSTEM > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "SYSTEM"}
                className={clsx(
                  styles.tabButton,
                  activeTab === "SYSTEM" && styles.tabButtonActive,
                )}
                onClick={() => setActiveTab("SYSTEM")}
              >
                <span>System</span>
                <span className={styles.tabCount}>{counts.SYSTEM}</span>
              </button>
            )}
          </div>

          {/* Search Field */}
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Search notifications"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className={styles.notificationList}>
        {filteredNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle2 size={40} className={styles.emptyIcon} aria-hidden="true" />
            <div className={styles.emptyTitle}>No matching notifications found</div>
            <div className={styles.emptyText}>
              {searchQuery
                ? `No notifications matched your search "${searchQuery}". Try a different keyword.`
                : "You are completely up to date in this category."}
            </div>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const exactDhakaTime = formatDhakaNotificationTime(item.createdAt);

            return (
              <article
                key={item.id}
                className={clsx(styles.card, !item.isRead && styles.cardUnread)}
              >
                {/* Header row: category, priority, exact Bangladesh timestamp */}
                <div className={styles.cardHeader}>
                  <div className={styles.badgeGroup}>
                    <span className={styles.typeBadge}>
                      {getCategoryIcon(item.type)}
                      <span>{item.type}</span>
                    </span>

                    <span
                      className={clsx(
                        styles.priorityBadge,
                        getPriorityBadgeClass(item.priority),
                      )}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className={styles.metaGroup}>
                    <time
                      className={styles.timestamp}
                      dateTime={item.createdAt}
                      title={`Asia/Dhaka: ${exactDhakaTime}`}
                    >
                      {exactDhakaTime}
                    </time>
                  </div>
                </div>

                {/* Title & Message */}
                <h2 className={styles.cardTitle}>{item.title}</h2>
                <p className={styles.cardMessage}>{item.message}</p>

                {/* Optional Expandable Clinical / Financial Details */}
                {item.details && (
                  <div>
                    <button
                      type="button"
                      className={styles.secondaryAction}
                      onClick={() => toggleExpand(item.id)}
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? "Hide Details" : "View Clinical Details"}</span>
                      {isExpanded ? (
                        <ChevronUp size={14} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={14} aria-hidden="true" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className={styles.detailsBox}>
                        <div className={styles.detailsLabel}>Clinical & Audit Details</div>
                        <div>{item.details}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Bar */}
                <div className={styles.cardActions}>
                  <div className={styles.actionLinks}>
                    <Link
                      to={item.actionUrl}
                      className={styles.primaryAction}
                      onClick={() => void markAsRead(item.id)}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>

                    {item.secondaryActionUrl && item.secondaryActionLabel && (
                      <Link
                        to={item.secondaryActionUrl}
                        className={styles.secondaryAction}
                        onClick={() => void markAsRead(item.id)}
                      >
                        <span>{item.secondaryActionLabel}</span>
                        <ExternalLink size={13} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
