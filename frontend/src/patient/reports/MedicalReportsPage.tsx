/**
 * Patient medical reports management page. Allows patients to upload lab/diagnostic reports (up to
 * 2 MB), view their uploaded reports, download them, and delete them. Reports are shared only with
 * doctors who have an appointment with the patient.
 */

import { reportsApi } from "../../api/reports";
import { Alert, Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatDhakaDateTime } from "../../shared/utils/format";
import { ReportUploadForm } from "./components/ReportUploadForm";
import { useMedicalReports } from "./hooks/useMedicalReports";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Patient Health Records</p>
        <h1>My medical reports</h1>
        <p className="muted">
          Upload lab tests, imaging, or past medical documents so your doctors can review them
          before your consultation. Only you and your treating doctors can access these files.
        </p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <ReportUploadForm
        onUploaded={loadReports}
        onError={setError}
        onNotice={setNotice}
      />

      {loading && <Spinner label="Loading medical reports…" />}
      {!loading && reports.length === 0 && (
        <EmptyState>You have not uploaded any medical reports yet.</EmptyState>
      )}

      {reports.map((report) => (
        <Card key={report.id}>
          <div className="row space-between">
            <div>
              <h3>{report.title}</h3>
              <p className="muted small">
                {report.fileName} · {formatFileSize(report.sizeBytes)} · Uploaded{" "}
                {formatDhakaDateTime(report.createdAt)}
              </p>
              {report.notes && <p className="small">Notes: {report.notes}</p>}
            </div>
            <Badge tone="info">{report.mimeType}</Badge>
          </div>
          <div className="row" style={{ marginTop: "0.75rem" }}>
            <Button
              variant="secondary"
              onClick={() => {
                void reportsApi
                  .downloadReport(report.id)
                  .catch((caught) =>
                    setError(getErrorMessage(caught, "Could not download report.")),
                  );
              }}
            >
              Download
            </Button>
            <Button variant="danger" onClick={() => void handleDelete(report.id)}>
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
