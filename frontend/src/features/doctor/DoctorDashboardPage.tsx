/**
 * Doctor workspace: profile summary, weekly schedule, and application status. Schedule editing is
 * read-only here; the backend supports PUT /doctors/me/schedule for full replacement.
 */

import { useEffect, useState } from "react";
import { api } from "../../shared/api";
import { formatMoney } from "../../shared/format";
import { Alert, Badge, Card, EmptyState, Spinner } from "../../components/ui";

interface ScheduleRule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  mode: "VIDEO" | "CHAMBER";
  isActive: boolean;
}

interface ScheduleOverview {
  timezone: string;
  rules: ScheduleRule[];
  timeOff: Array<{ id: string; date: string; startTime: string | null; endTime: string | null }>;
}

interface DoctorProfile {
  id: string;
  bmdcNumber: string;
  degrees: string | null;
  experienceYears: number;
  applicationStatus: string;
  videoConsultationFee: number | null;
  specialties: Array<{ id: string; name: string }>;
  chambers: Array<{ id: string; consultationFee: number; isActive: boolean }>;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function statusTone(status: string): string {
  if (status === "APPROVED") return "success";
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export function DoctorDashboardPage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api.get<DoctorProfile>("/doctors/me"),
      api.get<ScheduleOverview>("/doctors/me/schedule"),
    ])
      .then(([profileResult, scheduleResult]) => {
        setProfile(profileResult);
        setSchedule(scheduleResult);
      })
      .catch(() => setError("Could not load your doctor profile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!profile) return <EmptyState>No doctor profile found.</EmptyState>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Doctor dashboard</h1>
        <p className="muted">BMDC {profile.bmdcNumber}</p>
      </header>

      <Card>
        <div className="row space-between">
          <h2>Application status</h2>
          <Badge tone={statusTone(profile.applicationStatus)}>
            {profile.applicationStatus.replaceAll("_", " ")}
          </Badge>
        </div>
        {profile.applicationStatus !== "APPROVED" && (
          <Alert kind="info">
            Only approved doctors appear in public search and can receive bookings.
          </Alert>
        )}
        <dl className="facts">
          <div>
            <dt>Experience</dt>
            <dd>{profile.experienceYears} years</dd>
          </div>
          <div>
            <dt>Video fee</dt>
            <dd>{formatMoney(profile.videoConsultationFee)}</dd>
          </div>
          <div>
            <dt>Specialties</dt>
            <dd>{profile.specialties.map((s) => s.name).join(", ") || "—"}</dd>
          </div>
          <div>
            <dt>Chambers</dt>
            <dd>{profile.chambers.length}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2>Weekly schedule</h2>
        <p className="muted small">Timezone: {schedule?.timezone ?? "Asia/Dhaka"}</p>
        {!schedule || schedule.rules.length === 0 ? (
          <EmptyState>No weekly schedule configured.</EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Hours</th>
                <th>Slot</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {schedule.rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{DAY_NAMES[rule.dayOfWeek]}</td>
                  <td>
                    {rule.startTime.slice(0, 5)}–{rule.endTime.slice(0, 5)}
                  </td>
                  <td>{rule.slotDurationMinutes} min</td>
                  <td>{rule.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h2>Time off</h2>
        {!schedule || schedule.timeOff.length === 0 ? (
          <EmptyState>No blocked dates.</EmptyState>
        ) : (
          <ul>
            {schedule.timeOff.map((entry) => (
              <li key={entry.id}>
                {entry.date}
                {entry.startTime ? ` ${entry.startTime.slice(0, 5)}–${entry.endTime?.slice(0, 5)}` : " (full day)"}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
