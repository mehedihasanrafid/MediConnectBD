import { Calendar, FileText, Info, QrCode, ShieldCheck, Video, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { LinkedConsultation } from "../../types";
import styles from "./ContextDrawer.module.css";

interface ContextDrawerProps {
  consultation?: LinkedConsultation;
  onClose: () => void;
  onOpenVideoCall?: (appointmentId: string) => void;
}

export function ContextDrawer({
  consultation,
  onClose,
  onOpenVideoCall,
}: ContextDrawerProps) {
  if (!consultation) {
    return (
      <aside className={styles.container} aria-label="Conversation details">
        <div className={styles.header}>
          <h4 className={styles.title}>Conversation Info</h4>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close details">
            <X size={16} />
          </button>
        </div>
        <div className={styles.noticeBox}>
          <Info size={16} color="var(--color-primary)" />
          <span>General channel for patient assistance and inquiries.</span>
        </div>
      </aside>
    );
  }

  const isConfirmed = consultation.status === "CONFIRMED";

  return (
    <aside className={styles.container} aria-label="Consultation clinical details">
      <div className={styles.header}>
        <h4 className={styles.title}>Clinical Context</h4>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close details">
          <X size={16} />
        </button>
      </div>

      {/* Linked Appointment */}
      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>Linked Appointment</h5>
        <div className={styles.card}>
          <div className={styles.cardRow}>
            <span className={styles.cardLabel}>Specialist:</span>
            <span className={styles.cardValue}>{consultation.doctorName}</span>
          </div>
          <div className={styles.cardRow}>
            <span className={styles.cardLabel}>Specialty:</span>
            <span className={styles.cardValue}>{consultation.doctorSpecialty}</span>
          </div>
          {consultation.doctorHospital && (
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Hospital:</span>
              <span className={styles.cardValue}>{consultation.doctorHospital}</span>
            </div>
          )}
          <div className={styles.cardRow}>
            <span className={styles.cardLabel}>Mode:</span>
            <span className={styles.cardValueHighlight}>
              {consultation.mode === "VIDEO" ? "Online Video" : "Chamber Visit"}
            </span>
          </div>
          <div className={styles.cardRow}>
            <span className={styles.cardLabel}>Status:</span>
            <span className={styles.cardValue}>{consultation.status}</span>
          </div>
          <div className={styles.cardRow}>
            <span className={styles.cardLabel}>Fee:</span>
            <span className={styles.cardValue}>৳{consultation.feeAmount}</span>
          </div>

          {consultation.mode === "VIDEO" && onOpenVideoCall && (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => onOpenVideoCall(consultation.appointmentId)}
            >
              <Video size={14} color="var(--color-primary)" />
              <span>{isConfirmed ? "Launch Video Session" : "Video Room"}</span>
            </button>
          )}

          <Link to="/appointments" className={styles.actionButton}>
            <Calendar size={14} />
            <span>View in Appointments</span>
          </Link>
        </div>
      </div>

      {/* Issued Prescription */}
      {consultation.prescriptionCode && (
        <div className={styles.section}>
          <h5 className={styles.sectionTitle}>Prescription</h5>
          <div className={styles.card}>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Rx Code:</span>
              <span className={styles.cardValueHighlight}>{consultation.prescriptionCode}</span>
            </div>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Verification:</span>
              <span className={styles.cardValue}>BMDC Cryptographic QR</span>
            </div>
            <Link
              to={`/verify-prescription?code=${consultation.prescriptionCode}`}
              className={styles.actionButton}
            >
              <QrCode size={14} color="var(--color-primary)" />
              <span>Verify Prescription QR</span>
            </Link>
            <Link to="/prescriptions" className={styles.actionButton}>
              <FileText size={14} />
              <span>Open My Prescriptions</span>
            </Link>
          </div>
        </div>
      )}

      {/* Telehealth Follow-up Policy Notice */}
      <div className={styles.noticeBox}>
        <ShieldCheck size={16} color="var(--color-primary)" />
        <div>
          <strong>Telemedicine Follow-up Policy:</strong>
          <p style={{ margin: "4px 0 0" }}>
            Chat messages & report reviews are complimentary for {consultation.followUpDaysLeft ?? 7} days post-consultation.
          </p>
        </div>
      </div>
    </aside>
  );
}
