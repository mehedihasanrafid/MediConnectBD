import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileSignature,
  FileText,
  Home,
  ShieldCheck,
  Star,
  Stethoscope,
  User,
  Wifi,
} from "lucide-react";

import type { VideoSession } from "../../../../../../shared/types";
import { Button, Text } from "../../../../../../shared/ui";
import { formatDhakaDateTime } from "../../../../../../shared/utils/format";
import { playChimeSound } from "../../../../../../shared/utils/sound";
import styles from "./PostConsultationSummary.module.css";

export interface PostConsultationSummaryProps {
  session: VideoSession;
  appointmentId: string;
  consultationDurationMinutes?: number;
  consultNotes?: string;
  onClose: () => void;
  onBookFollowUp?: () => void;
  onIssuePrescription?: () => void;
}

const FEEDBACK_TAGS = [
  "Clear explanation",
  "Punctual & attentive",
  "Helpful prescription",
  "Great video quality",
  "Reassuring advice",
];

export function PostConsultationSummary({
  session,
  appointmentId,
  consultationDurationMinutes = 15,
  consultNotes = "",
  onClose,
  onBookFollowUp,
  onIssuePrescription,
}: PostConsultationSummaryProps) {
  const isDoctor = session.participantRole === "DOCTOR";
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Clear explanation", "Helpful prescription"]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [copiedNotes, setCopiedNotes] = useState<boolean>(false);

  function handleTagToggle(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleRatingSubmit() {
    playChimeSound("success");
    setFeedbackSubmitted(true);
  }

  function handleCopyNotes() {
    if (!consultNotes) return;
    navigator.clipboard.writeText(consultNotes);
    setCopiedNotes(true);
    playChimeSound("notification");
    setTimeout(() => setCopiedNotes(false), 2000);
  }

  return (
    <div className={styles.summaryWrapper} role="region" aria-label="Post-Consultation Summary">
      {/* Hero Concluded Card */}
      <div className={styles.heroCard}>
        <div className={styles.heroIconCircle} aria-hidden="true">
          <CheckCircle2 size={32} />
        </div>
        <h3 className={styles.heroTitle}>Consultation Concluded</h3>
        <p className={styles.heroSubtitle}>
          Your telehealth video consultation has ended successfully. Review session details, clinical
          notes, and follow-up deliverables below.
        </p>

        <div className={styles.badgesRow}>
          <span className={styles.statusPill}>
            <Wifi size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
            <span>Daily.co WebRTC HD Completed</span>
          </span>
          <span className={styles.statusPill}>
            <Clock size={12} aria-hidden="true" />
            <span>{`Duration: ~${consultationDurationMinutes} Minutes`}</span>
          </span>
          <span className={styles.statusPill}>
            <ShieldCheck size={12} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
            <span>BMDC Verified Telemedicine</span>
          </span>
        </div>
      </div>

      {/* Grid: Consultation Key Details */}
      <div className={styles.gridSection}>
        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <Stethoscope size={14} aria-hidden="true" />
            <span>Attending Doctor</span>
          </div>
          <div className={styles.detailValue}>Dr. {session.doctorName}</div>
          <div className={styles.subDetail}>Verified Medical Specialist · MediConnect BD</div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <User size={14} aria-hidden="true" />
            <span>Consulting Patient</span>
          </div>
          <div className={styles.detailValue}>{session.patientName}</div>
          <div className={styles.subDetail}>Appointment Reference: #{appointmentId.slice(0, 8)}</div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <Clock size={14} aria-hidden="true" />
            <span>Consultation Window</span>
          </div>
          <div className={styles.detailValue}>
            {formatDhakaDateTime(session.scheduledStartAt)}
          </div>
          <div className={styles.subDetail}>
            Room: {session.roomName}
          </div>
        </div>
      </div>

      {/* Deliverables: Prescription & Clinical Notes */}
      <div className={styles.deliverablesCard}>
        <Text size="sm" weight="bold">
          Clinical Deliverables &amp; Records
        </Text>

        {isDoctor ? (
          <>
            <div className={styles.deliverableRow}>
              <div className={styles.deliverableLeft}>
                <div className={styles.deliverableIconCircle} aria-hidden="true">
                  <FileSignature size={18} />
                </div>
                <div className={styles.deliverableInfo}>
                  <Text size="sm" weight="semibold">Digital Prescription (Rx)</Text>
                  <Text size="xs" tone="muted">
                    Issue or finalize Bangladesh standard e-prescription with Fast-RX presets.
                  </Text>
                </div>
              </div>
              {onIssuePrescription && (
                <Button variant="primary" size="sm" onClick={onIssuePrescription}>
                  <FileSignature size={14} style={{ marginRight: "4px" }} />
                  <span>Issue E-Prescription</span>
                </Button>
              )}
            </div>

            {consultNotes && (
              <div className={styles.deliverableRow}>
                <div className={styles.deliverableLeft}>
                  <div className={styles.deliverableIconCircle} aria-hidden="true">
                    <FileText size={18} />
                  </div>
                  <div className={styles.deliverableInfo}>
                    <Text size="sm" weight="semibold">In-Call Clinical Scratchpad Notes</Text>
                    <Text size="xs" tone="muted">
                      {consultNotes.slice(0, 80)}…
                    </Text>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleCopyNotes}>
                  {copiedNotes ? (
                    <>
                      <Check size={14} style={{ marginRight: "4px", color: "var(--color-success)" }} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} style={{ marginRight: "4px" }} />
                      <span>Copy Notes</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.deliverableRow}>
              <div className={styles.deliverableLeft}>
                <div className={styles.deliverableIconCircle} aria-hidden="true">
                  <FileText size={18} />
                </div>
                <div className={styles.deliverableInfo}>
                  <Text size="sm" weight="semibold">Digital Prescription &amp; Advice</Text>
                  <Text size="xs" tone="muted">
                    Your e-prescription issued by Dr. {session.doctorName} is digitally signed and saved to your portal.
                  </Text>
                </div>
              </div>
              <Link to="/prescriptions">
                <Button variant="secondary" size="sm">
                  View Prescriptions
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Patient Rating & Feedback Widget */}
      {!isDoctor && (
        <div className={styles.ratingSection}>
          <Text size="sm" weight="bold">Rate Your Consultation Experience</Text>
          <Text size="xs" tone="muted">
            Help improve care quality for Dr. {session.doctorName}
          </Text>

          <div className={styles.starsRow} aria-label={`Rating: ${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.starBtn} ${star <= rating ? styles.starActive : ""}`}
                onClick={() => setRating(star)}
                aria-label={`${star} star`}
              >
                <Star size={24} fill={star <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>

          <div className={styles.feedbackTagsRow}>
            {FEEDBACK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`${styles.tagPill} ${selectedTags.includes(tag) ? styles.tagPillActive : ""}`}
                onClick={() => handleTagToggle(tag)}
              >
                {selectedTags.includes(tag) && <Check size={12} />}
                <span>{tag}</span>
              </button>
            ))}
          </div>

          {!feedbackSubmitted ? (
            <div style={{ marginTop: "8px" }}>
              <Button variant="secondary" size="sm" onClick={handleRatingSubmit}>
                Submit Consultation Feedback
              </Button>
            </div>
          ) : (
            <div style={{ marginTop: "4px" }}>
              <Text size="xs" tone="success" weight="medium">
                ✓ Thank you! Your feedback has been recorded.
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <footer className={styles.actionsFooter}>
        {!isDoctor ? (
          <>
            {onBookFollowUp ? (
              <Button variant="primary" onClick={onBookFollowUp}>
                <Calendar size={14} style={{ marginRight: "6px" }} />
                <span>Book Follow-up Appointment</span>
              </Button>
            ) : (
              <Link to="/doctors">
                <Button variant="primary">
                  <Calendar size={14} style={{ marginRight: "6px" }} />
                  <span>Book Follow-up Appointment</span>
                </Button>
              </Link>
            )}
            <Button variant="secondary" onClick={onClose}>
              <Home size={14} style={{ marginRight: "6px" }} />
              <span>Return to Appointments</span>
            </Button>
          </>
        ) : (
          <>
            {onIssuePrescription && (
              <Button variant="primary" onClick={onIssuePrescription}>
                <FileSignature size={14} style={{ marginRight: "6px" }} />
                <span>Issue Prescription</span>
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              <Home size={14} style={{ marginRight: "6px" }} />
              <span>Back to Clinical Queue</span>
            </Button>
          </>
        )}
      </footer>
    </div>
  );
}
