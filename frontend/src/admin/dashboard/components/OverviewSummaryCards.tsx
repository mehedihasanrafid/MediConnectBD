import { CalendarCheck, DollarSign, Stethoscope, Users } from "lucide-react";

import type { AdminOverview } from "../../../shared/types";
import { formatMoney } from "../../../shared/utils/format";
import styles from "../AdminOverview.module.css";

interface OverviewSummaryCardsProps {
  overview: AdminOverview;
}

/**
 * Top KPI summary cards for the Admin Overview dashboard, styled after DokanBD's DashboardSummary.
 */
export function OverviewSummaryCards({ overview }: OverviewSummaryCardsProps) {
  return (
    <section className={styles.metricGrid} aria-label="Key platform metrics">
      <article className={styles.metricCard}>
        <div>
          <p>Total Users</p>
          <strong>{overview.users.total}</strong>
          <span>
            {overview.users.active} active · {overview.patients?.newThisMonth ?? 0} new patients this month
          </span>
        </div>
        <div className={styles.iconWrap} aria-hidden="true">
          <Users size={20} />
        </div>
      </article>

      <article className={styles.metricCard}>
        <div>
          <p>Verified Doctors</p>
          <strong>{overview.doctors.approved}</strong>
          <span>
            {overview.doctors.total} total · {overview.doctors.pendingReview} pending review
          </span>
        </div>
        <div className={styles.iconWrap} aria-hidden="true">
          <Stethoscope size={20} />
        </div>
      </article>

      <article className={styles.metricCard}>
        <div>
          <p>Appointments Today</p>
          <strong>{overview.appointments.today ?? 0}</strong>
          <span>
            {overview.appointments.total} total · {overview.appointments.completed} completed
          </span>
        </div>
        <div className={styles.iconWrap} aria-hidden="true">
          <CalendarCheck size={20} />
        </div>
      </article>

      <article className={styles.metricCard}>
        <div>
          <p>Platform Commission (15%)</p>
          <strong>{formatMoney(overview.payments.commissionAmount)}</strong>
          <span>
            Gross {formatMoney(overview.payments.grossAmount)} · Net {formatMoney(overview.payments.netAmount)}
          </span>
        </div>
        <div className={styles.iconWrap} aria-hidden="true">
          <DollarSign size={20} />
        </div>
      </article>
    </section>
  );
}
