import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Video,
} from "lucide-react";
import type { DoctorAppointment, Prescription } from "../../../../shared/types";
import { formatDhakaTime, formatMoney } from "../../../../shared/utils/format";
import styles from "./TodayPatientRadar.module.css";

interface PatientQueueCardProps {
  appointment: DoctorAppointment;
  existingRx?: Prescription;
  isCompleting: boolean;
  onInspectPatientHistory: (patientProfileId: string) => void;
  onComplete: (appointment: DoctorAppointment) => void;
  onDownloadPdf: (rxId: string, verificationCode: string) => void;
  onOpenIssuePrescription?: (appointment: DoctorAppointment) => void;
}

export function PatientQueueCard({
  appointment: appt,
  existingRx,
  isCompleting,
  onInspectPatientHistory,
  onComplete,
  onDownloadPdf,
  onOpenIssuePrescription,
}: PatientQueueCardProps) {
  const patientName = appt.patient
    ? `${appt.patient.firstName} ${appt.patient.lastName}`
    : "Demo Patient";
  const initials = appt.patient
    ? `${appt.patient.firstName?.[0] ?? "P"}${appt.patient.lastName?.[0] ?? ""}`
    : "PT";
  const isVideo = appt.mode === "VIDEO";
  const isCompleted = appt.status === "COMPLETED";
  const startTimeStr = formatDhakaTime(appt.scheduledStartAt);
  const endTimeStr = formatDhakaTime(appt.scheduledEndAt);

  return (
    <div
      key={appt.id}
      className={clsx(
        styles.patientItem,
        isCompleted
          ? styles.completedItem
          : isVideo
            ? styles.telehealthItem
            : styles.chamberItem,
      )}
    >
      <div className={styles.patientMain}>
        <div className={styles.patientIdentity}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.detailsCol}>
            <h3 className={styles.patientName}>{patientName}</h3>
            <span className={styles.patientSub}>
              {appt.patient?.phone || "Phone verified"} •{" "}
              {appt.familyMember ? `For: ${appt.familyMember.name}` : "Self"}
            </span>
          </div>
        </div>

        <div className={styles.badgeStack}>
          {isCompleted ? (
            <span className={styles.completedBadge}>
              <CheckCircle2 size={12} aria-hidden="true" />
              <span>Completed Consultation</span>
            </span>
          ) : (
            <span className={isVideo ? styles.modeBadgeVideo : styles.modeBadgeChamber}>
              {isVideo ? (
                <>
                  <Video size={13} aria-hidden="true" />
                  <span>Telehealth Video</span>
                </>
              ) : (
                <>
                  <MapPin size={13} aria-hidden="true" />
                  <span>Chamber Visit</span>
                </>
              )}
            </span>
          )}

          <span className={styles.timePill}>
            <Clock size={12} aria-hidden="true" />
            <span>
              {startTimeStr} – {endTimeStr}
            </span>
          </span>

          <span className={styles.feePill}>{formatMoney(appt.feeAmount)}</span>
        </div>
      </div>

      <div className={styles.actionsBar}>
        <div className={styles.leftButtons}>
          {!isCompleted && isVideo && (
            <Link to="/communication" className={styles.videoLaunchBtn}>
              <Video size={14} aria-hidden="true" />
              <span>Launch Telehealth Call</span>
            </Link>
          )}

          <button
            type="button"
            className={styles.historyBtn}
            onClick={() => onInspectPatientHistory(appt.patientProfileId)}
          >
            <FileSpreadsheet size={14} aria-hidden="true" />
            <span>Clinical History &amp; Reports</span>
          </button>

          {!isCompleted && (
            <button
              type="button"
              className={styles.completeBtn}
              onClick={() => onComplete(appt)}
              disabled={isCompleting}
              title="Mark consultation completed and proceed to post-visit Rx"
            >
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>{isCompleting ? "Completing…" : "Mark Done"}</span>
            </button>
          )}

          {isCompleted && existingRx && (
            <button
              type="button"
              className={styles.downloadRxBtn}
              onClick={() => onDownloadPdf(existingRx.id, existingRx.verificationCode)}
              title={`Download signed PDF for #${existingRx.verificationCode}`}
            >
              <Download size={13} aria-hidden="true" />
              <span>Download PDF (#{existingRx.verificationCode})</span>
            </button>
          )}
        </div>

        {isCompleted ? (
          existingRx ? (
            <Link to="/doctor/prescriptions" className={styles.rxLink}>
              <FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              <span>View / Edit Prescription</span>
              <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle", marginLeft: "2px" }} />
            </Link>
          ) : (
            <button
              type="button"
              className={styles.issueRxBtn}
              onClick={() => onOpenIssuePrescription?.(appt)}
            >
              <FileText size={13} aria-hidden="true" />
              <span>Issue E-Prescription</span>
            </button>
          )
        ) : (
          <button
            type="button"
            className={styles.rxLink}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
            onClick={() => onOpenIssuePrescription?.(appt)}
          >
            <FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            <span>Write E-Prescription</span>
            <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle", marginLeft: "2px" }} />
          </button>
        )}
      </div>
    </div>
  );
}
