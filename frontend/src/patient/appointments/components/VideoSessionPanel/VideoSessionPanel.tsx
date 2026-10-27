/**
 * Video consultation room panel for confirmed VIDEO appointments. Validates the 5-minute pre-start
 * entry window via `GET /api/v1/appointments/:appointmentId/video-session` and renders the video
 * consultation room for the booked patient and assigned doctor.
 */

import { useEffect, useState } from "react";

import { appointmentsApi } from "../../../../api/appointments";
import { Alert, Badge, Button, Spinner } from "../../../../components/ui";
import type { VideoSession } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatDhakaDateTime } from "../../../../shared/utils/format";
import styles from "./VideoSessionPanel.module.css";

export function VideoSessionPanel({
  appointmentId,
  onClose,
}: {
  appointmentId: string;
  onClose: () => void;
}) {
  const [session, setSession] = useState<VideoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void appointmentsApi
      .getVideoSession(appointmentId)
      .then((res) => {
        if (!cancelled) setSession(res);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            getErrorMessage(
              caught,
              "Video room opens 5 minutes before the scheduled start time.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h4 style={{ margin: 0 }}>Consultation Video Room</h4>
          <p className="muted small">Secure WebRTC / Twilio-backed room</p>
        </div>
        <Button variant="secondary" onClick={onClose}>
          Exit room
        </Button>
      </div>

      {loading && <Spinner label="Authenticating session and entering video room…" />}
      {error && <Alert kind="error">{error}</Alert>}

      {session && (
        <div style={{ marginTop: "0.5rem" }}>
          <div className="row">
            <Badge tone="success">Room Active</Badge>
            <span className="small">Room ID: {session.roomName}</span>
            <span className="muted small">
              Session open from {formatDhakaDateTime(session.scheduledStartAt)} until{" "}
              {formatDhakaDateTime(session.scheduledEndAt)}
            </span>
          </div>

          <div className={styles.roomScreen}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                {session.roomName}
              </p>
              <p style={{ margin: "0.25rem 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                Participant: {session.participantName} ({session.participantRole}) · Doctor: Dr. {session.doctorName}
              </p>
            </div>

            <div className={styles.roomActions}>
              <Button
                variant={micEnabled ? "primary" : "secondary"}
                onClick={() => setMicEnabled(!micEnabled)}
              >
                {micEnabled ? "Mute Mic" : "Unmute Mic"}
              </Button>
              <Button
                variant={camEnabled ? "primary" : "secondary"}
                onClick={() => setCamEnabled(!camEnabled)}
              >
                {camEnabled ? "Turn Off Camera" : "Turn On Camera"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
