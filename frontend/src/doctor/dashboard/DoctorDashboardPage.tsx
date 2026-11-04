import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Alert, Button, ButtonLink, Spinner } from "../../shared/ui";
import type { DoctorAppointment } from "../../shared/types";
import { FocusedPatientCard } from "./patient-focus/FocusedPatientCard";
import { PatientQueue } from "./patient-focus/PatientQueue";
import { DashboardPanels } from "./patient-focus/DashboardPanels";
import { usePatientDashboard } from "./patient-focus/usePatientDashboard";
import { legacyDashboardPath, todaysPatients } from "./patient-focus/patientFocus.model";
import type { PatientPanelKind, PatientPanelSelection } from "./patient-focus/patientFocus.types";
import styles from "./patient-focus/PatientFocus.module.css";

export function DoctorDashboardPage() {
  const [query] = useSearchParams();
  const redirect = legacyDashboardPath(query.get("tab"));
  return redirect ? <Navigate to={redirect} replace /> : <TodaysPatientDashboard />;
}

function TodaysPatientDashboard() {
  const data = usePatientDashboard();
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PatientPanelSelection | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  if (data.loading) return <Spinner label="Loading today's patients…" />;
  if (data.profileError || !data.profile) return <Alert kind="error">
    {data.profileError || "No doctor profile found."}
    <Button size="sm" variant="secondary" onClick={() => void data.reload()}>Retry loading dashboard</Button>
  </Alert>;
  if (data.profile.applicationStatus !== "APPROVED") return <div className={styles.stack}>
    <h1>Doctor dashboard</h1>
    <Alert kind="info">Your application is {data.profile.applicationStatus.toLowerCase().replaceAll("_", " ")}.
      Patient appointments become available after approval.</Alert>
    <ButtonLink to="/doctor/profile">Review your profile</ButtonLink>
  </div>;
  const day = todaysPatients(data.appointments, now);
  const focused = day.remaining.find((item) => item.id === selectedId) ?? day.next;
  const panelAppointment = panel ? data.appointments.find((item) => item.id === panel.appointmentId) : null;
  const openPanel = (appointment: DoctorAppointment, kind: PatientPanelKind) => {
    setSelectedId(appointment.id);
    setPanel({ appointmentId: appointment.id, kind });
  };
  return <div className={styles.page}>
    <div className={styles.top}>
      <h1 id="todays-patients-heading" tabIndex={-1}>Today’s patients</h1>
      <div className={styles.topRight}>
        {data.hasAppointments && <dl className={styles.counts} aria-label="Today's appointment counts">
          <div><dt>booked</dt><dd>{day.today.length}</dd></div>
          <div><dt>left</dt><dd>{day.remaining.length}</dd></div>
          <div><dt>done</dt><dd>{day.completed}</dd></div>
        </dl>}
        <Button variant="ghost" size="sm" disabled={data.refreshing} aria-label="Refresh today's patients"
          onClick={() => void data.reload()}><RefreshCw size={14} aria-hidden="true" /></Button>
      </div>
    </div>
    {data.appointmentsError && <Alert kind="error">
      {data.appointmentsError}{data.hasAppointments && " Showing the last loaded appointments."}
      <Button size="sm" variant="secondary" disabled={data.refreshing} onClick={() => void data.reload()}>Retry appointments</Button>
    </Alert>}
    {data.hasAppointments && <>
      <FocusedPatientCard appointment={focused} now={now} selected={Boolean(focused && focused.id !== day.next?.id)}
        onOpen={openPanel} onReset={() => setSelectedId(null)} />
      <PatientQueue appointments={day.remaining.filter((item) => item.id !== focused?.id)}
        onSelect={(appointment) => openPanel(appointment, "details")}
        onReadiness={(appointment) => openPanel(appointment, "readiness")} />
    </>}
    {panel && panelAppointment && <DashboardPanels key={panelAppointment.id} appointment={panelAppointment}
      kind={panel.kind} now={now} onOpen={openPanel} onClose={() => setPanel(null)} reload={data.reload} />}
  </div>;
}
