import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import type { AdminOverview } from "../../../shared/types";
import { ButtonLink } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { DescriptionList } from "../../../shared/ui/DescriptionList";
import { Cluster, Grid } from "../../../shared/ui/Layout";
import { Text } from "../../../shared/ui/Text";
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
    <Grid min="320px" gap={4}>
      <Card>
        <Cluster justify="between" align="center">
          <h2>Users</h2>
          <ButtonLink variant="secondary" size="sm" to="/admin/users">
            Manage
          </ButtonLink>
        </Cluster>
        <DescriptionList
          columns={2}
          items={[
            { label: "Total", value: overview.users.total },
            { label: "Active", value: overview.users.active },
            { label: "Pending", value: overview.users.pending },
            { label: "Suspended", value: overview.users.suspended },
            { label: "New patients (this month)", value: overview.patients?.newThisMonth ?? 0 },
          ]}
        />
      </Card>

      <Card>
        <Cluster justify="between" align="center">
          <h2>Doctors</h2>
          <ButtonLink variant="secondary" size="sm" to="/admin/applications">
            Review queue
          </ButtonLink>
        </Cluster>
        <DescriptionList
          columns={2}
          items={[
            { label: "Total", value: overview.doctors.total },
            { label: "Approved", value: overview.doctors.approved },
            { label: "Pending review", value: overview.doctors.pendingReview },
          ]}
        />
      </Card>

      <Card>
        <Cluster justify="between" align="center">
          <h2>Appointments</h2>
          <ButtonLink variant="secondary" size="sm" to="/admin/operations">
            View all
          </ButtonLink>
        </Cluster>
        <DescriptionList
          columns={2}
          items={[
            { label: "Total", value: overview.appointments.total },
            { label: "Today (Dhaka)", value: overview.appointments.today ?? 0 },
            { label: "Confirmed", value: overview.appointments.confirmed },
            { label: "Completed", value: overview.appointments.completed },
            { label: "Cancelled", value: overview.appointments.cancelled },
          ]}
        />
      </Card>

      <Card>
        <h2>Payments & 10% Commission</h2>
        <DescriptionList
          columns={2}
          items={[
            { label: "Succeeded", value: overview.payments.succeeded },
            { label: "Gross volume", value: formatMoney(overview.payments.grossAmount) },
            { label: "Commission (10%)", value: formatMoney(overview.payments.commissionAmount) },
            { label: "Doctor net", value: formatMoney(overview.payments.netAmount) },
          ]}
        />
      </Card>

      <Card>
        <Cluster justify="between" align="center">
          <h2>Refund requests</h2>
          <ButtonLink variant="secondary" size="sm" to="/admin/operations">
            Process refunds
          </ButtonLink>
        </Cluster>
        <DescriptionList
          columns={2}
          items={[
            { label: "Requested", value: overview.refunds.requested },
            { label: "Total requested", value: formatMoney(Number(overview.refunds.totalAmount)) },
          ]}
        />
      </Card>

      <Card>
        <Cluster justify="between" align="center">
          <div>
            <p className={styles.eyebrow}>Demand Leaderboard</p>
            <h2>Most booked specialties</h2>
          </div>
          <ButtonLink variant="secondary" size="sm" to="/admin/catalog">
            Catalog
          </ButtonLink>
        </Cluster>
        {!overview.mostBookedSpecialties || overview.mostBookedSpecialties.length === 0 ? (
          <Text tone="muted" size="sm">No specialty bookings recorded yet.</Text>
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
                      style={
                        {
                          "--bar": `${(spec.appointmentsCount / maxSpecialtyCount) * 100}%`,
                        } as CSSProperties
                      }
                    />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <Cluster justify="between" align="center">
          <div>
            <p className={styles.eyebrow}>Clinical Leaderboard</p>
            <h2>Top doctors</h2>
          </div>
          <ButtonLink variant="secondary" size="sm" to="/doctors">
            Directory
          </ButtonLink>
        </Cluster>
        {!overview.topDoctors || overview.topDoctors.length === 0 ? (
          <Text tone="muted" size="sm">No doctor bookings recorded yet.</Text>
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
                      style={
                        {
                          "--bar": `${(doc.appointmentsCount / maxDoctorCount) * 100}%`,
                        } as CSSProperties
                      }
                    />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </Grid>
  );
}
