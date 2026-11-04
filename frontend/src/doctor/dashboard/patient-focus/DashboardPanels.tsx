import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { DoctorAppointment } from "../../../shared/types";
import { VideoSessionPanel } from "../../../patient/appointments/components/VideoSessionPanel";
import { IssuePrescriptionModal } from "../components/IssuePrescriptionModal";
import { PatientDetails } from "./PatientDetails";
import { PatientRecordsPanel } from "./PatientRecordsPanel";
import { PatientToolsPanel } from "./PatientToolsPanel";
import { ReadinessDetails } from "./PatientReadiness";
import { AppointmentActionPanel } from "./AppointmentActionPanel";
import { patientIdentity } from "./patientFocus.model";
import type { OpenPatientPanel, PatientPanelKind } from "./patientFocus.types";
import styles from "./PatientPanels.module.css";

export function DashboardPanels({ appointment, kind, now, onOpen, onClose, reload }: {
  appointment: DoctorAppointment; kind: PatientPanelKind; now: Date;
  onOpen: OpenPatientPanel; onClose: () => void; reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const name = patientIdentity(appointment).name;
  if (kind === "prescription") return <IssuePrescriptionModal appointment={appointment} isOpen
    onClose={onClose} onAppointmentCompleted={() => void reload()}
    onPrescriptionIssued={() => { onClose(); void reload(); }} />;
  const video = kind === "video";
  const mutation = kind === "complete" || kind === "cancel" || kind === "no-show";
  const tabs = [
    { kind: "details", label: "Details" }, { kind: "records", label: "History & reports" },
    { kind: "tools", label: "Tools" },
  ] as const;
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={video ? styles.video : styles.drawer}
        onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById("todays-patients-heading")?.focus(); }}
        onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
        onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
        <div className={styles.header}>
          <div><Dialog.Title className={styles.title}>{video ? `Video consultation · ${name}` : name}</Dialog.Title>
            <Dialog.Description className={styles.description}>{video ? "Leaving the room does not mark the consultation completed." : "Patient details and consultation tools"}</Dialog.Description></div>
          <Dialog.Close className={styles.close} disabled={busy} aria-label={video ? "Close video room" : "Close patient panel"}><X size={19} /></Dialog.Close>
        </div>
        {!video && !mutation && <nav className={styles.tabs} aria-label="Patient panel sections">
          {tabs.map((tab) => <button key={tab.kind} type="button" aria-pressed={kind === tab.kind}
            onClick={() => onOpen(appointment, tab.kind)}>{tab.label}</button>)}
        </nav>}
        <div className={styles.body} key={`${appointment.id}:${kind}`}>
          {kind === "details" && <PatientDetails appointment={appointment} full />}
          {kind === "records" && <PatientRecordsPanel appointment={appointment} onClose={onClose} />}
          {kind === "tools" && <PatientToolsPanel appointment={appointment} now={now} onOpen={onOpen} />}
          {kind === "readiness" && <ReadinessDetails />}
          {video && <VideoSessionPanel clinicalToolsEnabled={false} appointmentId={appointment.id} onClose={onClose} />}
          {mutation && <AppointmentActionPanel appointment={appointment} action={kind} onBusyChange={setBusy}
            onBack={() => onOpen(appointment, "tools")} onSaved={async () => { await reload(); onClose(); }} />}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
