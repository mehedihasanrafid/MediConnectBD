import { Sparkles } from "lucide-react";
import type { RadarModeFilter } from "./types";
import styles from "./TodayPatientRadar.module.css";

interface RadarEmptyStateProps {
  searchQuery: string;
  modeFilter: RadarModeFilter;
}

export function RadarEmptyState({ searchQuery, modeFilter }: RadarEmptyStateProps) {
  const isSearch = Boolean(searchQuery.trim());
  const isCompleted = modeFilter === "COMPLETED";

  const title = isSearch
    ? "No matching patients found"
    : isCompleted
      ? "No completed visits yet today"
      : "Queue all caught up!";

  const text = isSearch
    ? "Try adjusting your search terms or filter mode."
    : isCompleted
      ? "Ongoing consultations marked as done will appear here ready for digital prescriptions."
      : "No pending consultations scheduled right now. New patient bookings will appear here in real time.";

  return (
    <div className={styles.emptyState}>
      <Sparkles size={28} className={styles.emptyIcon} aria-hidden="true" />
      <span className={styles.emptyTitle}>{title}</span>
      <span className={styles.emptyText}>{text}</span>
    </div>
  );
}
