import { Link } from "react-router-dom";

import { Card } from "../../../components/ui";
import type { AdminOverview } from "../../../shared/types";
import { formatMoney } from "../../../shared/utils/format";
import styles from "../AdminOverview.module.css";

interface TopSpecialtiesAndDoctorsProps {
  overview: AdminOverview;
}

/**
 * Operational breakdown panels for Users, Doctors, Appointments, Payments, Refunds,
 * and ranked progress-bar leaderboards for Most Booked Specialties and Top Doctors.
 */
export function TopSpecialtiesAndDoctors({ overview }: TopSpecialtiesAndDoctorsProps) {
  const maxSpecialtyCount = Math.max(
    ...(overview.mostBookedSpecialties?.map((s) => s.appointmentsCount) ?? []),
    1,
  );
  const maxDoctorCount = Math.max(
    ...(overview.topDoctors?.map((d) => d.appointmentsCount) ?? []),
    1,
  );

  return (
    <div className="grid">
      <Card>
        <div className="row space-between">
          <h2>Users</h2>
          <Link className="btn btn-secondary" to="/admin/users">
            Manage
          </Link>
        </div>
        <dl className="facts">
          <div>
            <dt>Total</dt>
            <dd>{overview.users.total}</dd>
          </div>
          <div>
            <dt>Active</dt>
            <dd>{overview.users.active}</dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>{overview.users.pending}</dd>
          </div>
          <div>
            <dt>Suspended</dt>
            <dd>{overview.users.suspended}</dd>
          </div>
          <div>
            <dt>New patients (this month)</dt>
            <dd>{overview.patients?.newThisMonth ?? 0}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="row space-between">
          <h2>Doctors</h2>
          <Link className="btn btn-secondary" to="/admin/applications">
            Review queue
          </Link>
        </div>
        <dl className="facts">
          <div>
            <dt>Total</dt>
            <dd>{overview.doctors.total}</dd>
          </div>
          <div>
            <dt>Approved</dt>
            <dd>{overview.doctors.approved}</dd>
          </div>
          <div>
            <dt>Pending review</dt>
            <dd>{overview.doctors.pendingReview}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="row space-between">
          <h2>Appointments</h2>
          <Link className="btn btn-secondary" to="/admin/operations">
            View all
          </Link>
        </div>
        <dl className="facts">
          <div>
            <dt>Total</dt>
            <dd>{overview.appointments.total}</dd>
          </div>
          <div>
            <dt>Today (Dhaka)</dt>
            <dd>{overview.appointments.today ?? 0}</dd>
          </div>
          <div>
            <dt>Confirmed</dt>
            <dd>{overview.appointments.confirmed}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{overview.appointments.completed}</dd>
          </div>
          <div>
            <dt>Cancelled</dt>
            <dd>{overview.appointments.cancelled}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2>Payments & 10% Commission</h2>
        <dl className="facts">
          <div>
            <dt>Succeeded</dt>
            <dd>{overview.payments.succeeded}</dd>
          </div>
          <div>
            <dt>Gross volume</dt>
            <dd>{formatMoney(overview.payments.grossAmount)}</dd>
          </div>
          <div>
            <dt>Commission (10%)</dt>
            <dd>{formatMoney(overview.payments.commissionAmount)}</dd>
          </div>
          <div>
            <dt>Doctor net</dt>
            <dd>{formatMoney(overview.payments.netAmount)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="row space-between">
          <h2>Refund requests</h2>
          <Link className="btn btn-secondary" to="/admin/operations">
            Process refunds
          </Link>
        </div>
        <dl className="facts">
          <div>
            <dt>Requested</dt>
            <dd>{overview.refunds.requested}</dd>
          </div>
          <div>
            <dt>Total requested</dt>
            <dd>{formatMoney(Number(overview.refunds.totalAmount))}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="row space-between">
          <div>
            <p className="eyebrow">Demand Leaderboard</p>
            <h2>Most booked specialties</h2>
          </div>
          <Link className="btn btn-secondary" to="/admin/catalog">
            Catalog
          </Link>
        </div>
        {!overview.mostBookedSpecialties || overview.mostBookedSpecialties.length === 0 ? (
          <p className="muted small">No specialty bookings recorded yet.</p>
        ) : (
          <ol className={styles.rankList}>
            {overview.mostBookedSpecialties.map((spec, index) => (
              <li key={spec.specialtyId}>
                <span className={styles.rankBadge}>{index + 1}</span>
                <div>
                  <div className={styles.rankTitle}>
                    <strong>{spec.name}</strong>
                    <span>{spec.appointmentsCount} bookings</span>
                  </div>
                  <p className={styles.rankMeta}>Slug: {spec.slug}</p>
                  <span className={styles.rankTrack}>
                    <i
                      style={{
                        width: `${(spec.appointmentsCount / maxSpecialtyCount) * 100}%`,
                      }}
                    />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <div className="row space-between">
          <div>
            <p className="eyebrow">Clinical Leaderboard</p>
            <h2>Top doctors</h2>
          </div>
          <Link className="btn btn-secondary" to="/doctors">
            Directory
          </Link>
        </div>
        {!overview.topDoctors || overview.topDoctors.length === 0 ? (
          <p className="muted small">No doctor bookings recorded yet.</p>
        ) : (
          <ol className={styles.rankList}>
            {overview.topDoctors.map((doc, index) => (
              <li key={doc.doctorId}>
                <span className={styles.rankBadge}>{index + 1}</span>
                <div>
                  <div className={styles.rankTitle}>
                    <Link to={`/doctors/${doc.doctorId}`}>
                      Dr. {doc.firstName} {doc.lastName}
                    </Link>
                    <span>{doc.appointmentsCount} total</span>
                  </div>
                  <p className={styles.rankMeta}>
                    BMDC {doc.bmdcNumber} · {doc.completedCount} completed consultations
                  </p>
                  <span className={styles.rankTrack}>
                    <i
                      style={{
                        width: `${(doc.appointmentsCount / maxDoctorCount) * 100}%`,
                      }}
                    />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
