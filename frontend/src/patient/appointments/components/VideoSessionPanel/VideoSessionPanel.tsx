/**
 * Video consultation room panel for confirmed VIDEO appointments. Validates the 5-minute pre-start
 * entry window via `GET /api/v1/appointments/:appointmentId/video-session` and connects the booked
 * patient and assigned doctor via Daily.co WebRTC room credentials.
 */

import { useEffect, useState } from "react";
import {
  Columns2,
  FileText,
  Maximize2,
  Minimize2,
  Pill,
  Sliders,
  StickyNote,
} from "lucide-react";

import { appointmentsApi } from "../../../../api/appointments";
import { reportsApi } from "../../../../api/reports";
import { FAST_RX_PRESET_BUNDLES } from "../../../../doctor/dashboard/data/fastRxPresets";
import {
  Alert,
  Badge,
  Button,
  Cluster,
  EmptyState,
  Field,
  Spinner,
  Table,
  Text,
} from "../../../../shared/ui";
import type { MedicalReportSummary, VideoSession } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatDhakaDateTime } from "../../../../shared/utils/format";
import { playChimeSound } from "../../../../shared/utils/sound";
import { VideoPreCallLobby } from "./components/VideoPreCallLobby";
import styles from "./VideoSessionPanel.module.css";

export function VideoSessionPanel({
  appointmentId,
  initialSession,
  skipLobby = false,
  onClose,
}: {
  appointmentId: string;
  initialSession?: VideoSession | null;
  skipLobby?: boolean;
  onClose: () => void;
}) {
  const [session, setSession] = useState<VideoSession | null>(initialSession ?? null);
  const [loading, setLoading] = useState(!initialSession);
  const [error, setError] = useState<string | null>(null);

  // If initialSession is passed (e.g. in unit tests), bypass lobby so static render matches
  const [isInLobby, setIsInLobby] = useState(!initialSession && !skipLobby);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [clinicalTab, setClinicalTab] = useState<"FILES" | "FASTRX" | "NOTES">("FILES");

  const [activeTab, setActiveTab] = useState<"CALL" | "FILES">("CALL");
  const [reports, setReports] = useState<MedicalReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [fileNotice, setFileNotice] = useState<string | null>(null);

  // In-call private scratchpad notes
  const [consultNotes, setConsultNotes] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`consult_notes_${appointmentId}`) || "";
    }
    return "";
  });

  useEffect(() => {
    if (initialSession) return;

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
  }, [appointmentId, initialSession]);

  async function loadReports() {
    if (!session || session.participantRole !== "PATIENT") return;
    setLoadingReports(true);
    try {
      const res = await reportsApi.listMyReports();
      setReports(res.items);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load shared consultation files."));
    } finally {
      setLoadingReports(false);
    }
  }

  // Pre-load reports if split view is toggled
  function handleToggleSplitView() {
    const next = !isSplitView;
    setIsSplitView(next);
    if (next) {
      setIsTheaterMode(false);
      void loadReports();
    }
  }

  function handleNotesChange(text: string) {
    setConsultNotes(text);
    if (typeof window !== "undefined") {
      localStorage.setItem(`consult_notes_${appointmentId}`, text);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !session) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File exceeds the 2 MB limit.");
      return;
    }
    setUploadBusy(true);
    setError(null);
    setFileNotice(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = reader.result as string;
        const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
        await reportsApi.uploadReport({
          title: uploadTitle.trim() || file.name,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: base64,
          notes: `Uploaded during consultation ${session.appointmentId}`,
        });
        setFileNotice(`File "${file.name}" uploaded and shared securely with Dr. ${session.doctorName}.`);
        setUploadTitle("");
        await loadReports();
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not upload file during consultation."));
      } finally {
        setUploadBusy(false);
      }
    };
    reader.onerror = () => {
      setError("Could not read file from disk.");
      setUploadBusy(false);
    };
    reader.readAsDataURL(file);
  }

  const isMockProvider = Boolean(
    session?.roomUrl.includes("mock") ||
      session?.accessToken.startsWith("mock_") ||
      session?.roomUrl.includes("localhost"),
  );

  const embedUrl = session
    ? `${session.roomUrl}${session.roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(session.accessToken)}`
    : "";

  function handleJoinFromLobby() {
    setIsInLobby(false);
    playChimeSound("call");
  }

  return (
    <div
      className={`${styles.container} ${isTheaterMode ? styles.containerTheater : ""} ${
        isSplitView ? styles.containerSplitView : ""
      }`}
    >
      {/* 1. Pre-Call Lobby Screen */}
      {session && isInLobby && (
        <VideoPreCallLobby
          session={session}
          onJoinRoom={handleJoinFromLobby}
          onCancel={onClose}
        />
      )}

      {/* 2. Active Consultation Room & File Drawer */}
      {(!isInLobby || !session) && (
        <>
          <div className={styles.header}>
            <div>
              <h4 className={styles.title}>Consultation Video Room</h4>
              <Text tone="muted" size="sm" className={styles.participantSubtitle}>
                {session
                  ? `Participant: ${session.participantName} (${session.participantRole === "DOCTOR" ? "Doctor" : "Patient"})`
                  : "Connecting to consultation slot…"}
              </Text>
            </div>
            <Button variant="secondary" onClick={onClose}>
              Exit room
            </Button>
          </div>

          {loading && <Spinner label="Authenticating session and entering video room…" />}
          {error && <Alert kind="error">{error}</Alert>}
          {fileNotice && <Alert kind="success">{fileNotice}</Alert>}

          {session && (
            <div>
              <div className={styles.metaBar}>
                <div className={styles.metaStatus}>
                  {isMockProvider ? (
                    <Badge tone="warning">Development Mock Mode</Badge>
                  ) : (
                    <Badge tone="success">Live Video Active</Badge>
                  )}
                  <Text size="sm" as="span">Room: {session.roomName}</Text>
                </div>
                <Text tone="muted" size="sm">
                  Session window: {formatDhakaDateTime(session.scheduledStartAt)} –{" "}
                  {formatDhakaDateTime(session.scheduledEndAt)}
                </Text>
              </div>

              <div className={styles.tabs}>
                <div className={styles.tabGroup}>
                  <Button
                    variant={activeTab === "CALL" ? "primary" : "secondary"}
                    onClick={() => setActiveTab("CALL")}
                  >
                    Video Call &amp; In-call Chat
                  </Button>
                  <Button
                    variant={activeTab === "FILES" ? "primary" : "secondary"}
                    onClick={() => {
                      setActiveTab("FILES");
                      void loadReports();
                    }}
                  >
                    Consultation Files &amp; Reports
                  </Button>
                </div>

                <div className={styles.viewModeGroup}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsInLobby(true)}
                    title="Re-open pre-call device diagnostics"
                  >
                    <Sliders size={14} style={{ marginRight: "4px" }} />
                    <span>Device Check</span>
                  </Button>

                  <Button
                    variant={isSplitView ? "primary" : "secondary"}
                    size="sm"
                    onClick={handleToggleSplitView}
                    title="Toggle side-by-side Clinical Assistant Wing"
                  >
                    <Columns2 size={14} style={{ marginRight: "4px" }} />
                    <span>{isSplitView ? "Close Split-View" : "Clinical Split-View"}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isSplitView}
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    title={isTheaterMode ? "Standard View" : "Theater Mode"}
                  >
                    {isTheaterMode ? (
                      <>
                        <Minimize2 size={14} style={{ marginRight: "4px" }} />
                        <span>Standard View</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 size={14} style={{ marginRight: "4px" }} />
                        <span>Theater Mode</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {activeTab === "CALL" && (
                <div>
                  {isMockProvider ? (
                    <div className={styles.mockScreen}>
                      <Alert kind="info">
                        Daily API keys are not configured in backend environment. Operating in development
                        mock mode for room <code>{session.roomName}</code>.
                      </Alert>
                      <div className={styles.mockDetails}>
                        <p>
                          <strong>Doctor:</strong> Dr. {session.doctorName}
                        </p>
                        <p>
                          <strong>Patient:</strong> {session.patientName}
                        </p>
                        <p>
                          <strong>Participant:</strong> {session.participantName} ({session.participantRole})
                        </p>
                        <p>
                          <strong>Token Preview:</strong>{" "}
                          <code>{session.accessToken.slice(0, 36)}…</code>
                        </p>
                      </div>
                      <div className={styles.mockActions}>
                        <Button variant="secondary" onClick={onClose}>
                          Leave mock room
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={isSplitView ? styles.splitGrid : undefined}>
                      {/* Left: Video Iframe & Controls */}
                      <div className={isSplitView ? styles.videoWing : undefined}>
                        <iframe
                          src={embedUrl}
                          className={`${styles.videoFrame} ${
                            isTheaterMode ? styles.videoFrameTheater : ""
                          }`}
                          title="Consultation Video Session"
                          allow="camera; microphone; fullscreen; display-capture; autoplay"
                          allowFullScreen
                        />
                        <div className={styles.callControls}>
                          <Text tone="muted" size="sm" className={styles.callNotice}>
                            In-call text chat, screen sharing, and audio/video controls are active in the call window.
                          </Text>
                          <Cluster gap={2} className={styles.callButtons}>
                            <Button
                              variant="secondary"
                              onClick={() => window.open(embedUrl, "_blank", "noopener,noreferrer")}
                            >
                              Open in separate window
                            </Button>
                            <Button variant="danger" onClick={onClose}>
                              Leave call
                            </Button>
                          </Cluster>
                        </div>
                      </div>

                      {/* Right: In-Call Clinical Assistant Wing */}
                      {isSplitView && (
                        <div className={styles.clinicalWing}>
                          <div className={styles.clinicalWingHeader}>
                            <h4 className={styles.clinicalWingTitle}>
                              Clinical Telehealth Assistant
                            </h4>
                            <Badge tone="info">
                              {session.participantRole === "DOCTOR" ? "Doctor Mode" : "Patient Records"}
                            </Badge>
                          </div>

                          <div className={styles.clinicalTabs}>
                            <button
                              type="button"
                              className={`${styles.clinicalTabBtn} ${
                                clinicalTab === "FILES" ? styles.clinicalTabBtnActive : ""
                              }`}
                              onClick={() => {
                                setClinicalTab("FILES");
                                void loadReports();
                              }}
                            >
                              <FileText size={12} style={{ marginRight: "4px" }} />
                              <span>Records &amp; Labs</span>
                            </button>

                            <button
                              type="button"
                              className={`${styles.clinicalTabBtn} ${
                                clinicalTab === "FASTRX" ? styles.clinicalTabBtnActive : ""
                              }`}
                              onClick={() => setClinicalTab("FASTRX")}
                            >
                              <Pill size={12} style={{ marginRight: "4px" }} />
                              <span>Fast-RX Protocols</span>
                            </button>

                            <button
                              type="button"
                              className={`${styles.clinicalTabBtn} ${
                                clinicalTab === "NOTES" ? styles.clinicalTabBtnActive : ""
                              }`}
                              onClick={() => setClinicalTab("NOTES")}
                            >
                              <StickyNote size={12} style={{ marginRight: "4px" }} />
                              <span>Clinical Scratchpad</span>
                            </button>
                          </div>

                          {/* Tab 1: Records & Shared Labs */}
                          {clinicalTab === "FILES" && (
                            <div className={styles.clinicalTabContent}>
                              {loadingReports && <Spinner label="Loading records…" />}
                              {!loadingReports && reports.length === 0 && (
                                <Text size="sm" tone="muted">
                                  No diagnostic reports uploaded for this patient yet.
                                </Text>
                              )}
                              {!loadingReports && reports.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {reports.map((r) => (
                                    <div
                                      key={r.id}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "8px 12px",
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "var(--radius-md)",
                                      }}
                                    >
                                      <div>
                                        <Text size="sm" weight="bold">{r.title}</Text>
                                        <Text size="sm" tone="muted">{r.fileName}</Text>
                                      </div>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => void reportsApi.downloadReport(r.id)}
                                      >
                                        Download
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tab 2: Fast-RX Protocol Bundles */}
                          {clinicalTab === "FASTRX" && (
                            <div className={styles.fastRxList}>
                              <Text size="sm" tone="muted">
                                Standard Bangladesh clinical guidelines for rapid e-prescription during call:
                              </Text>
                              {FAST_RX_PRESET_BUNDLES.map((bundle) => (
                                <div key={bundle.id} className={styles.fastRxCard}>
                                  <div className={styles.fastRxTitleRow}>
                                    <Text size="sm" weight="bold">{bundle.title}</Text>
                                    <Badge tone="neutral">{bundle.category}</Badge>
                                  </div>
                                  <Text size="sm" tone="muted">
                                    Dx: {bundle.diagnosis}
                                  </Text>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                    {bundle.medicines.map((m, idx) => (
                                      <span key={idx} className={styles.fastRxMedPill}>
                                        {m.name} ({m.dosage})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Tab 3: Consultation Clinical Notes Scratchpad */}
                          {clinicalTab === "NOTES" && (
                            <div className={styles.clinicalTabContent}>
                              <Text size="sm" tone="muted">
                                Private observations during this video call (persisted in your browser):
                              </Text>
                              <textarea
                                className={styles.notesTextarea}
                                value={consultNotes}
                                onChange={(e) => handleNotesChange(e.target.value)}
                                placeholder="Record patient symptoms, blood pressure, temperature, or diagnostic notes…"
                              />
                              <p className={styles.notesSaveHint}>
                                ✓ Notes auto-saved locally for appointment {appointmentId.slice(0, 8)}…
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "FILES" && (
                <div className={styles.filesCard}>
                  <div className={styles.filesHeader}>
                    <h4 className={styles.filesTitle}>In-call Clinical File Sharing</h4>
                    <Text tone="muted" size="sm" className={styles.filesNotice}>
                      Files shared here are protected by appointment authorization and accessible only by
                      the treating doctor and patient.
                    </Text>
                  </div>

                  {session.participantRole === "PATIENT" && (
                    <div className={styles.uploadBox}>
                      <Text size="sm" weight="bold">Share a document with Dr. {session.doctorName}</Text>
                      <div className={styles.uploadRow}>
                        <div className={styles.uploadTitleField}>
                          <Field
                            label="Document title"
                            value={uploadTitle}
                            onChange={setUploadTitle}
                            placeholder="e.g. Blood Test Oct 2026"
                          />
                        </div>
                        <div>
                          <label
                            className={styles.fileSelectLabel}
                            data-busy={uploadBusy}
                          >
                            <Button variant="secondary" as="span">
                              {uploadBusy ? "Uploading…" : "Select File (PDF/Image)"}
                            </Button>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className={styles.fileInputHidden}
                              disabled={uploadBusy}
                              onChange={(e) => void handleFileUpload(e)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {loadingReports && <Spinner label="Loading consultation files…" />}

                  {!loadingReports && reports.length === 0 && (
                    <EmptyState>No files shared for this consultation yet.</EmptyState>
                  )}

                  {!loadingReports && reports.length > 0 && (
                    <div className={styles.filesTable}>
                      <Table>
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>File name</th>
                            <th>Uploaded</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((r) => (
                            <tr key={r.id}>
                              <td>{r.title}</td>
                              <td>{r.fileName}</td>
                              <td>{formatDhakaDateTime(r.createdAt)}</td>
                              <td>
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    void reportsApi
                                      .downloadReport(r.id)
                                      .catch((caught) =>
                                        setError(getErrorMessage(caught, "Could not download file.")),
                                      );
                                  }}
                                >
                                  Download
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
