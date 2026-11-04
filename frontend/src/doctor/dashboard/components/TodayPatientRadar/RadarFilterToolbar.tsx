import clsx from "clsx";
import { Search } from "lucide-react";
import type { RadarModeFilter } from "./types";
import styles from "./TodayPatientRadar.module.css";

interface RadarFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  modeFilter: RadarModeFilter;
  onModeFilterChange: (mode: RadarModeFilter) => void;
  counts: {
    active: number;
    video: number;
    chamber: number;
    completed: number;
  };
}

export function RadarFilterToolbar({
  searchQuery,
  onSearchChange,
  modeFilter,
  onModeFilterChange,
  counts,
}: RadarFilterToolbarProps) {
  return (
    <div className={styles.filterToolbar}>
      <div className={styles.searchBox}>
        <Search size={14} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search today's queue by patient name or phone…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Filter patient queue"
        />
      </div>

      <div className={styles.filterPills}>
        <button
          type="button"
          className={clsx(styles.filterPill, modeFilter === "ALL" && styles.filterPillActive)}
          onClick={() => onModeFilterChange("ALL")}
        >
          All ({counts.active})
        </button>
        <button
          type="button"
          className={clsx(styles.filterPill, modeFilter === "VIDEO" && styles.filterPillActive)}
          onClick={() => onModeFilterChange("VIDEO")}
        >
          Video ({counts.video})
        </button>
        <button
          type="button"
          className={clsx(styles.filterPill, modeFilter === "CHAMBER" && styles.filterPillActive)}
          onClick={() => onModeFilterChange("CHAMBER")}
        >
          Chamber ({counts.chamber})
        </button>
        <button
          type="button"
          className={clsx(styles.filterPill, modeFilter === "COMPLETED" && styles.filterPillActive)}
          onClick={() => onModeFilterChange("COMPLETED")}
        >
          Completed ({counts.completed})
        </button>
      </div>
    </div>
  );
}
