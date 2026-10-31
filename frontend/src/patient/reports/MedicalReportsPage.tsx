/**
 * Patient medical reports management page. Allows patients to upload lab/diagnostic reports (up to
 * 2 MB), view their uploaded reports, download them, and delete them. Reports are shared only with
 * doctors who have an appointment with the patient.
 */

import { useMemo, useState } from "react";
import { reportsApi } from "../../api/reports";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Page,
  PageHeader,
  Spinner,
  Text,
} from "../../shared/ui";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatDhakaDateTime } from "../../shared/utils/format";
import { PatientBreadcrumbs } from "../components/PatientBreadcrumbs";
import { ReportUploadForm } from "./components/ReportUploadForm";
import { useMedicalReports } from "./hooks/useMedicalReports";
import styles from "./MedicalReportsPage.module.css";

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMimeCategory(mime: string, fileName: string): "pdf" | "image" | "text" | "other" {
  const m = (mime || "").toLowerCase();
  const f = (fileName || "").toLowerCase();
  if (m.includes("pdf") || f.endsWith(".pdf")) return "pdf";
  if (m.includes("image") || /\.(jpe?g|png|webp|gif|svg)$/i.test(f)) return "image";
  if (m.includes("text") || f.endsWith(".txt")) return "text";
  return "other";
}

export function MedicalReportsPage() {
  const {
    reports,
    loading,
    error,
    setError,
    notice,
    setNotice,
    loadReports,
    handleDelete,
  } = useMedicalReports();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "pdf" | "image" | "text">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "size-desc" | "title-asc">("newest");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Compute KPI statistics
  const totalReports = reports.length;
  const totalBytes = useMemo(
    () => reports.reduce((acc, r) => acc + (r.sizeBytes || 0), 0),
    [reports],
  );

  const pdfCount = useMemo(
    () => reports.filter((r) => getMimeCategory(r.mimeType, r.fileName) === "pdf").length,
    [reports],
  );
  const imgCount = useMemo(
    () => reports.filter((r) => getMimeCategory(r.mimeType, r.fileName) === "image").length,
    [reports],
  );
  const textCount = useMemo(
    () => reports.filter((r) => getMimeCategory(r.mimeType, r.fileName) === "text").length,
    [reports],
  );

  // Filtered and sorted reports
  const filteredReports = useMemo(() => {
    let result = reports;

    // Filter category
    if (activeFilter !== "all") {
      result = result.filter((r) => getMimeCategory(r.mimeType, r.fileName) === activeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.fileName.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)),
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "size-desc") {
        return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      }
      return a.title.localeCompare(b.title);
    });
  }, [reports, activeFilter, searchQuery, sortBy]);

  async function handleDownload(reportId: string) {
    setDownloadingId(reportId);
    setError(null);
    try {
      await reportsApi.downloadReport(reportId);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not download report."));
    } finally {
      setDownloadingId(null);
    }
  }

  async function onReportDelete(reportId: string) {
    if (!window.confirm("Are you sure you want to permanently delete this diagnostic report?")) {
      return;
    }
    setDeletingId(reportId);
    try {
      await handleDelete(reportId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Page>
      <div className={styles.container}>
        <PatientBreadcrumbs activePageLabel="Diagnostic Reports & Labs" />

        <PageHeader
          eyebrow="PATIENT HEALTH VAULT"
          title="Diagnostic & medical reports"
          description="Upload and manage lab tests, diagnostic imaging, and past medical records (up to 2 MB). Your records are encrypted and strictly accessible only by you and your treating doctors during active consultations."
        />

        {error && <Alert kind="error">{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}

        {/* Diagnostic KPI Strip */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Stored Reports</span>
            <span className={styles.kpiValue}>{totalReports} documents</span>
            <span className={styles.kpiSubtext}>Available for consultation review</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Vault Storage Used</span>
            <span className={styles.kpiValue}>{formatFileSize(totalBytes)}</span>
            <span className={styles.kpiSubtext}>Max 2 MB per individual file</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Access Security</span>
            <span className={styles.kpiValue}>AES-256 Cloud</span>
            <span className={styles.kpiSubtext}>Restricted to assigned doctors</span>
          </div>
        </div>

        {/* Toolbar with live search, triage filter pills, sort, and upload toggle */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <svg
              className={styles.searchIcon}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search reports by title, test name, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterPills}>
            <button
              type="button"
              className={`${styles.filterPill} ${activeFilter === "all" ? styles.filterPillActive : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All ({totalReports})
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${activeFilter === "pdf" ? styles.filterPillActive : ""}`}
              onClick={() => setActiveFilter("pdf")}
            >
              PDFs ({pdfCount})
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${activeFilter === "image" ? styles.filterPillActive : ""}`}
              onClick={() => setActiveFilter("image")}
            >
              Scans/Images ({imgCount})
            </button>
            {textCount > 0 && (
              <button
                type="button"
                className={`${styles.filterPill} ${activeFilter === "text" ? styles.filterPillActive : ""}`}
                onClick={() => setActiveFilter("text")}
              >
                Text/Notes ({textCount})
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "newest" | "oldest" | "size-desc" | "title-asc")
            }
            className={styles.sortSelect}
            aria-label="Sort reports"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="size-desc">Sort: Largest File</option>
            <option value="title-asc">Sort: A-Z</option>
          </select>

          <Button
            variant={showUploadForm ? "secondary" : "primary"}
            size="sm"
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            {showUploadForm ? "✕ Close Upload Panel" : "+ Upload Diagnostic Report"}
          </Button>
        </div>

        {/* Collapsible / Expandable Upload Form */}
        {(showUploadForm || (!loading && reports.length === 0)) && (
          <div className={styles.uploadSection}>
            <ReportUploadForm
              onUploaded={async () => {
                await loadReports();
                setShowUploadForm(false);
              }}
              onError={setError}
              onNotice={setNotice}
              onCancel={() => setShowUploadForm(false)}
            />
          </div>
        )}

        {loading && <Spinner label="Loading medical diagnostic reports…" />}

        {!loading && reports.length === 0 && !showUploadForm && (
          <EmptyState>
            You have not uploaded any medical reports yet. Click &quot;+ Upload Diagnostic Report&quot;
            to upload your first document.
          </EmptyState>
        )}

        {!loading && reports.length > 0 && filteredReports.length === 0 && (
          <EmptyState>
            No reports match your current search query or filter. Try adjusting your search term.
          </EmptyState>
        )}

        {/* Responsive Document Grid */}
        <div className={styles.reportsGrid}>
          {filteredReports.map((report) => {
            const category = getMimeCategory(report.mimeType, report.fileName);
            return (
              <div key={report.id} className={styles.reportCard}>
                <div className={styles.cardTop}>
                  <div
                    className={`${styles.mimeIconContainer} ${
                      category === "pdf"
                        ? styles.mimeIconPdf
                        : category === "image"
                          ? styles.mimeIconImg
                          : styles.mimeIconTxt
                    }`}
                  >
                    {category === "pdf" ? (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    ) : category === "image" ? (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    ) : (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                  </div>

                  <div className={styles.cardHeadInfo}>
                    <h3 className={styles.reportTitle} title={report.title}>
                      {report.title}
                    </h3>
                    <div className={styles.reportMeta}>
                      <span>{report.fileName}</span>
                      <span className={styles.dotSeparator}>·</span>
                      <span>{formatFileSize(report.sizeBytes)}</span>
                      <span className={styles.dotSeparator}>·</span>
                      <span>{formatDhakaDateTime(report.createdAt)}</span>
                    </div>
                  </div>

                  <Badge tone={category === "pdf" ? "error" : category === "image" ? "info" : "success"}>
                    {category.toUpperCase()}
                  </Badge>
                </div>

                {report.notes && (
                  <div className={styles.notesBox}>
                    <Text size="sm">“{report.notes}”</Text>
                  </div>
                )}

                <div className={styles.privacyTag}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Encrypted · Visible to attending doctors only</span>
                </div>

                <div className={styles.cardActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={downloadingId === report.id}
                    onClick={() => void handleDownload(report.id)}
                  >
                    {downloadingId === report.id ? "Downloading…" : "Download Report"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deletingId === report.id}
                    onClick={() => void onReportDelete(report.id)}
                  >
                    {deletingId === report.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Docked Health Status Bar */}
        <div className={styles.statusBar} role="status" aria-label="Vault status bar">
          <div className={styles.statusLeft}>
            <span className={styles.statusPill}>
              <span className={styles.pulseDot} />
              <span>Diagnostic Vault: Online &amp; Synced</span>
            </span>
            <span>·</span>
            <span>
              Showing {filteredReports.length} of {reports.length} documents
            </span>
          </div>
          <div className={styles.statusRight}>
            <span>Upload Limit: 2.0 MB per document · Formats: PDF, JPG, PNG, WEBP, TXT</span>
          </div>
        </div>
      </div>
    </Page>
  );
}
