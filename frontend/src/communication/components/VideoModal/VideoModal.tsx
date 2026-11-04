import { Video, X } from "lucide-react";
import { VideoSessionPanel } from "../../../patient/appointments/components/VideoSessionPanel";
import styles from "./VideoModal.module.css";

interface VideoModalProps {
  appointmentId: string;
  onClose: () => void;
}

export function VideoModal({ appointmentId, onClose }: VideoModalProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Video Consultation">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Video size={18} color="var(--color-primary)" />
            <span>Telehealth Video Consultation</span>
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close video room">
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <VideoSessionPanel clinicalToolsEnabled={false} appointmentId={appointmentId} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
