import { BarChart3, Calendar, Clock, Stethoscope } from "lucide-react";
import clsx from "clsx";
import styles from "./DoctorViewSwitcher.module.css";

export type DoctorDashboardTab = "queue" | "analytics" | "schedule";

interface DoctorViewSwitcherProps {
  activeTab: DoctorDashboardTab;
  onChangeTab: (tab: DoctorDashboardTab) => void;
  activeQueueCount: number;
}

export function DoctorViewSwitcher({
  activeTab,
  onChangeTab,
  activeQueueCount,
}: DoctorViewSwitcherProps) {
  return (
    <div className={styles.tabBarContainer}>
      <div className={styles.tabsList} role="tablist" aria-label="Dashboard views">
        {/* Tab 1: Queue */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "queue"}
          className={clsx(styles.tabBtn, activeTab === "queue" && styles.tabBtnActive)}
          onClick={() => onChangeTab("queue")}
        >
          <Stethoscope size={16} aria-hidden="true" />
          <span>Today&apos;s Queue</span>
          {activeQueueCount > 0 && <span className={styles.badge}>{activeQueueCount}</span>}
        </button>

        {/* Tab 2: Analytics & Revenue */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "analytics"}
          className={clsx(styles.tabBtn, activeTab === "analytics" && styles.tabBtnActive)}
          onClick={() => onChangeTab("analytics")}
        >
          <BarChart3 size={16} aria-hidden="true" />
          <span>Practice Analytics & Revenue</span>
        </button>

        {/* Tab 3: Schedule & Profile Setup */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "schedule"}
          className={clsx(styles.tabBtn, activeTab === "schedule" && styles.tabBtnActive)}
          onClick={() => onChangeTab("schedule")}
        >
          <Calendar size={16} aria-hidden="true" />
          <span>Weekly Schedule & Chambers</span>
        </button>
      </div>

      <div className={styles.rightMeta}>
        <Clock size={13} aria-hidden="true" />
        <span>Clinical Intake Active</span>
      </div>
    </div>
  );
}
