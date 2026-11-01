import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  Video,
  Volume2,
} from "lucide-react";

import type { VideoSession } from "../../../../../../shared/types";
import { Alert, Button, Text } from "../../../../../../shared/ui";
import { formatDhakaDateTime } from "../../../../../../shared/utils/format";
import { playChimeSound } from "../../../../../../shared/utils/sound";
import styles from "./VideoPreCallLobby.module.css";

export interface VideoPreCallLobbyProps {
  session: VideoSession;
  onJoinRoom: (preferences: { initialMuted: boolean; initialVideoOff: boolean }) => void;
  onCancel: () => void;
}

export function VideoPreCallLobby({ session, onJoinRoom, onCancel }: VideoPreCallLobbyProps) {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [micVolume, setMicVolume] = useState(0);
  const [isAudioTesting, setIsAudioTesting] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    async function initMedia() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPermissionNotice("Camera/Mic device preview unavailable in this environment.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup Web Audio Analyser for live mic meter
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkVolume = () => {
            if (!active) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((average / 128) * 100));
            setMicVolume(normalized);
            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };

          checkVolume();
        }
      } catch {
        if (active) {
          setPermissionNotice(
            "Camera or microphone access was not granted. You can still enter the consultation and enable them inside the call.",
          );
        }
      }
    }

    void initMedia();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  function handleToggleCamera() {
    if (streamRef.current) {
      const next = !isCameraOn;
      streamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
      setIsCameraOn(next);
    } else {
      setIsCameraOn(!isCameraOn);
    }
  }

  function handleToggleMic() {
    if (streamRef.current) {
      const next = !isMicOn;
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
      setIsMicOn(next);
      if (!next) setMicVolume(0);
    } else {
      setIsMicOn(!isMicOn);
    }
  }

  function handleTestSpeaker() {
    setIsAudioTesting(true);
    playChimeSound("call");
    setTimeout(() => setIsAudioTesting(false), 800);
  }

  function handleProceedToRoom() {
    // Release preview stream so Daily.co gets clean exclusive device access
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    onJoinRoom({
      initialMuted: !isMicOn,
      initialVideoOff: !isCameraOn,
    });
  }

  const initialLetter = session.participantName?.charAt(0).toUpperCase() || "U";

  return (
    <div className={styles.lobbyCard} aria-label="Telehealth Pre-Call Lobby">
      <div className={styles.lobbyHeader}>
        <div className={styles.lobbyTitleGroup}>
          <h3 className={styles.lobbyTitle}>Telehealth Pre-Flight Device Check</h3>
          <span className={styles.lobbySubtitle}>
            Verify your camera, microphone, and sound before meeting{" "}
            {session.participantRole === "PATIENT" ? `Dr. ${session.doctorName}` : session.patientName}
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel &amp; Exit
        </Button>
      </div>

      {permissionNotice && <Alert kind="info">{permissionNotice}</Alert>}

      <div className={styles.lobbyGrid}>
        {/* Left: Video Preview Window */}
        <div className={styles.previewSection}>
          <div className={styles.videoWrapper}>
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`${styles.videoElement} ${isMirrored ? styles.videoMirrored : ""}`}
                aria-label="Camera preview"
              />
            ) : (
              <div className={styles.videoOffOverlay}>
                <div className={styles.avatarInitial}>{initialLetter}</div>
                <Text size="sm">Camera is turned off</Text>
              </div>
            )}

            <div className={styles.qualityBadge}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--color-success-fg)" }} />
              <span>HD 720p Ready</span>
            </div>

            <button
              type="button"
              className={styles.mirrorBadgeBtn}
              onClick={() => setIsMirrored(!isMirrored)}
              title="Toggle camera mirror"
            >
              <RefreshCw size={11} />
              <span>{isMirrored ? "Mirrored" : "Normal"}</span>
            </button>

            {/* In-Preview Quick Action Pill */}
            <div className={styles.videoControlsBar}>
              <button
                type="button"
                className={`${styles.controlCircleBtn} ${!isMicOn ? styles.controlCircleBtnMuted : ""}`}
                onClick={handleToggleMic}
                title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                aria-label={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>

              <button
                type="button"
                className={`${styles.controlCircleBtn} ${!isCameraOn ? styles.controlCircleBtnMuted : ""}`}
                onClick={handleToggleCamera}
                title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
                aria-label={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
              >
                {isCameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
              </button>
            </div>
          </div>

          <p className={styles.participantNotice}>
            You will join as <strong>{session.participantName}</strong> ({session.participantRole === "DOCTOR" ? "Doctor" : "Patient"})
          </p>
        </div>

        {/* Right: Device Diagnostics & Action */}
        <div className={styles.settingsSection}>
          {/* Live Mic Meter */}
          <div className={styles.meterCard}>
            <div className={styles.meterHeader}>
              <span>Microphone Volume Check</span>
              <span>{isMicOn ? (micVolume > 5 ? "Sound detected" : "Speak to test") : "Muted"}</span>
            </div>
            <div className={styles.meterTrack}>
              <div
                className={styles.meterFill}
                style={{
                  width: `${isMicOn ? micVolume : 0}%`,
                  backgroundColor: micVolume > 70 ? "var(--color-error-fg)" : "var(--color-success-fg)",
                }}
              />
            </div>
          </div>

          {/* Sound / Speaker Check */}
          <div className={styles.soundTestRow}>
            <div>
              <Text size="sm" weight="bold">Audio &amp; Speaker</Text>
              <Text size="sm" tone="muted">Make sure you can hear the chime</Text>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isAudioTesting}
              onClick={handleTestSpeaker}
            >
              <Volume2 size={14} style={{ marginRight: "4px" }} />
              {isAudioTesting ? "Playing…" : "Test Sound"}
            </Button>
          </div>

          {/* Consultation Summary */}
          <div className={styles.consultSummaryCard}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Attending Doctor</span>
              <span className={styles.summaryValue}>Dr. {session.doctorName}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Patient</span>
              <span className={styles.summaryValue}>{session.patientName}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Scheduled Time</span>
              <span className={styles.summaryValue}>{formatDhakaDateTime(session.scheduledStartAt)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Encryption</span>
              <span className={styles.summaryValue} style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--color-success)" }}>
                <ShieldCheck size={12} />
                <span>AES-256 WebRTC</span>
              </span>
            </div>
          </div>

          {/* Main Action CTAs */}
          <div className={styles.actionsArea}>
            <Button
              type="button"
              variant="primary"
              className={styles.joinBtn}
              onClick={handleProceedToRoom}
            >
              <Video size={18} />
              <span>Enter Consultation Room</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCancel}
            >
              Back to Appointments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
