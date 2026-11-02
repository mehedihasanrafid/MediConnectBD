import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
  UserX,
  Video,
  X,
  XCircle,
} from "lucide-react";

import { Badge } from "../../../../shared/ui";
import type { DoctorAppointment, Prescription } from "../../../../shared/types";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../../../shared/utils/format";
import { appointmentStatusTone } from "../../utils/statusTone";
import styles from "./AppointmentDetailsDrawer.module.css";

interface AppointmentDetailsDrawerProps {
  appointment: DoctorAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onInspectPatientHistory: (patientProfileId: string) => void;
  onComplete: (appt: DoctorAppointment) => void;
  onNoShow: (appt: DoctorAppointment) => void;
  onCancel: (appt: DoctorAppointment) => void;
  onIssueRx: (appt: DoctorAppointment) => void;
  onDownloadRx?: (rx: Prescription) => void;
  existingRx?: Prescription;
  isBusy?: boolean;
}

export function AppointmentDetailsDrawer({
  appointment,
  isOpen,
  onClose,
  onInspectPatientHistory,
  onComplete,
  onNoShow,
  onCancel,
  onIssueRx,
  onDownloadRx,
  existingRx,
  isBusy = false,
}: AppointmentDetailsDrawerProps) {
  if (!isOpen || !appointment) return null;

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : "Patient Visit";

  const initials = appointment.patient
    ? `${appointment.patient.firstName?.[0] ?? "P"}${appointment.patient.lastName?.[0] ?? ""}`.toUpperCase()
    : "PT";

  const isVideo = appointment.mode === "VIDEO";
  const isConfirmed = appointment.status === "CONFIRMED";
  const isCompleted = appointment.status === "COMPLETED";

  // Calculate duration in minutes if slots are available
  const startMs = new Date(appointment.scheduledStartAt).getTime();
  const endMs = new Date(appointment.scheduledEndAt).getTime();
  const durationMin = Math.round((endMs - startMs) / (1000 * 60)) || 15;

  const chamberHospital = (
    appointment.slot?.chamber as unknown as {
      roomOrUnit?: string | null;
      hospital?: { name?: string; address?: string; area?: string };
    } | null
  )?.hospital;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Appointment Details"
      >
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <h2 className={styles.title}>Consultation Details</h2>
            <span className={styles.subtitle}>
              ID: {appointment.id}
            </span>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.body}>
          {/* Patient Overview Section */}
          <section className={styles.cardSection} aria-label="Patient Information">
            <h3 className={styles.sectionTitle}>
              <User size={14} aria-hidden="true" />
              <span>Patient Profile</span>
            </h3>

            <div className={styles.patientRow}>
              <div className={styles.avatar}>{initials}</div>
              <div className={styles.patientMeta}>
                <h4 className={styles.patientName}>{patientName}</h4>
                <div className={styles.patientContact}>
                  {appointment.patient?.phone ? (
                    <span>
                      <Phone size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                      {appointment.patient.phone}
                    </span>
                  ) : (
                    <span>Phone not registered</span>
                  )}
                  {appointment.patient?.email && (
                    <span>
                      <Mail size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                      {appointment.patient.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.detailsList}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Beneficiary</span>
                <span className={styles.detailValue}>
                  {appointment.familyMember
                    ? `${appointment.familyMember.name} (${appointment.familyMember.relationship})`
                    : "Self (Account holder)"}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Patient ID</span>
                <span className={styles.detailValue} title={appointment.patientProfileId}>
                  {appointment.patientProfileId.slice(0, 12)}…
                </span>
              </div>
            </div>

            <button
              type="button"
              className={styles.secondaryActionBtn}
              onClick={() => onInspectPatientHistory(appointment.patientProfileId)}
            >
              <FileSpreadsheet size={14} aria-hidden="true" />
              <span>Inspect Full Clinical History &amp; Reports</span>
            </button>
          </section>

          {/* Consultation Details Section */}
          <section className={styles.cardSection} aria-label="Consultation Parameters">
            <h3 className={styles.sectionTitle}>
              <Calendar size={14} aria-hidden="true" />
              <span>Visit Schedule &amp; Mode</span>
            </h3>

            <div className={styles.detailsList}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Consultation Mode</span>
                <span className={styles.detailValue}>
                  {isVideo ? "Telehealth Video" : "In-Person Chamber"}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Status</span>
                <span className={styles.detailValue}>
                  <Badge tone={appointmentStatusTone(appointment.status)}>
                    {formatStatus(appointment.status)}
                  </Badge>
                </span>
              </div>

              <div className={styles.detailItemFull}>
                <span className={styles.detailLabel}>Scheduled Start (Dhaka)</span>
                <span className={styles.detailValue}>
                  <Clock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  {formatDhakaDateTime(appointment.scheduledStartAt)} ({durationMin} min slot)
                </span>
              </div>

              {!isVideo && (
                <div className={styles.detailItemFull}>
                  <span className={styles.detailLabel}>Chamber Location</span>
                  <span className={styles.detailValue}>
                    <MapPin size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                    {chamberHospital?.name
                      ? `${chamberHospital.name}${chamberHospital.area ? `, ${chamberHospital.area}` : ""}`
                      : "Registered Chamber Unit"}
                    {appointment.slot?.chamber?.roomOrUnit
                      ? ` · Room ${appointment.slot.chamber.roomOrUnit}`
                      : ""}
                  </span>
                </div>
              )}

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Consultation Fee</span>
                <span className={styles.detailValue}>
                  {formatMoney(appointment.feeAmount)}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Payment</span>
                <span className={styles.detailValue}>
                  <CreditCard size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  {appointment.paymentRequired
                    ? appointment.paymentReference
                      ? `Paid (${appointment.paymentReference})`
                      : "Pending Payment"
                    : "No Charge"}
                </span>
              </div>

              {appointment.cancellationReason && (
                <div className={styles.detailItemFull}>
                  <span className={styles.detailLabel}>Cancellation Reason</span>
                  <span className={styles.detailValue} style={{ color: "var(--color-danger)" }}>
                    {appointment.cancellationReason}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Actions Section */}
          <section className={styles.actionsGroup} aria-label="Clinical Actions">
            {isConfirmed && isVideo && (
              <Link to={`/doctor/consultations/${appointment.id}`} className={styles.primaryActionBtn}>
                <Video size={16} aria-hidden="true" />
                <span>Launch Telehealth Consultation</span>
              </Link>
            )}

            {isConfirmed && !isVideo && (
              <Link to={`/doctor/consultations/${appointment.id}`} className={styles.primaryActionBtn}>
                <MapPin size={16} aria-hidden="true" />
                <span>Conduct In-Person Consultation</span>
              </Link>
            )}

            {isConfirmed && (
              <button
                type="button"
                className={styles.completeActionBtn}
                disabled={isBusy}
                onClick={() => onComplete(appointment)}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>Mark Consultation Completed</span>
              </button>
            )}

            {isCompleted && (
              <>
                {existingRx ? (
                  <>
                    {onDownloadRx && (
                      <button
                        type="button"
                        className={styles.secondaryActionBtn}
                        onClick={() => onDownloadRx(existingRx)}
                      >
                        <Download size={14} aria-hidden="true" />
                        <span>Download Prescription PDF (#{existingRx.verificationCode})</span>
                      </button>
                    )}
                    <Link to="/doctor/prescriptions" className={styles.primaryActionBtn}>
                      <FileText size={15} aria-hidden="true" />
                      <span>View / Edit Prescription</span>
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryActionBtn}
                    onClick={() => onIssueRx(appointment)}
                  >
                    <FileText size={15} aria-hidden="true" />
                    <span>Issue Digital Prescription</span>
                  </button>
                )}
              </>
            )}

            {isConfirmed && (
              <div className={styles.dangerActions}>
                <button
                  type="button"
                  className={styles.noShowBtn}
                  disabled={isBusy}
                  onClick={() => onNoShow(appointment)}
                >
                  <UserX size={14} aria-hidden="true" />
                  <span>Mark No-Show</span>
                </button>

                <button
                  type="button"
                  className={styles.dangerBtn}
                  disabled={isBusy}
                  onClick={() => onCancel(appointment)}
                >
                  <XCircle size={14} aria-hidden="true" />
                  <span>Cancel Consultation</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
