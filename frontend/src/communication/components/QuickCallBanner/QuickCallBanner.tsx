import { Video } from "lucide-react";
import styles from "./QuickCallBanner.module.css";

interface QuickCallBannerProps {
  doctorOrPatientName: string;
  role: "DOCTOR" | "PATIENT";
  appointmentId: string;
  onJoinCall: (appointmentId: string) => void;
}

export function QuickCallBanner({
  doctorOrPatientName,
  role,
  appointmentId,
  onJoinCall,
}: QuickCallBannerProps) {
  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <div className={styles.iconWrapper}>
          <Video size={20} aria-hidden="true" />
        </div>
        <div className={styles.content}>
          <p className={styles.headline}>
            <span className={styles.liveDot} aria-hidden="true" />
            <span>
              {role === "PATIENT"
                ? `Live Video Call Ready with ${doctorOrPatientName}`
                : `Consultation Slot Active for ${doctorOrPatientName}`}
            </span>
          </p>
          <p className={styles.subline}>
            Daily.co secure WebRTC room is open and waiting for participants.
          </p>
        </div>
      </div>

      <button
        type="button"
        className={styles.joinButton}
        onClick={() => onJoinCall(appointmentId)}
      >
        <Video size={16} aria-hidden="true" />
        <span>Join Video Room</span>
      </button>
    </div>
  );
}
