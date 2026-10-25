/**
 * Admin doctor application review. Lists pending applications and allows approve or reject with a
 * reason, matching the backend admin endpoints.
 */

import { useEffect, useState } from "react";
import { api, ApiRequestError } from "../../shared/api";
import { Alert, Badge, Button, Card, EmptyState, Field, Spinner } from "../../components/ui";

interface DoctorApplication {
  id: string;
  bmdcNumber: string;
  degrees: string | null;
  experienceYears: number;
  applicationStatus: string;
  user?: { firstName: string; lastName: string; email: string };
}

export function AdminApplicationsPage() {
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await api.get<{ items: DoctorApplication[] }>(
        "/admin/doctors/applications?status=PENDING_REVIEW",
      );
      setApplications(result.items);
    } catch {
      setError("Could not load doctor applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(doctorId: string, decision: "APPROVED" | "REJECTED", rejectionReason?: string) {
    setError(null);
    try {
      await api.patch(`/admin/doctors/${doctorId}/application`, {
        decision,
        ...(rejectionReason ? { reason: rejectionReason } : {}),
      });
      setRejectingId(null);
      setReason("");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Could not record the decision.");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Doctor applications</h1>
        <p className="muted">Review credentials and approve or reject pending applications.</p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner label="Loading applications…" />}
      {!loading && applications.length === 0 && (
        <EmptyState>No pending applications.</EmptyState>
      )}

      {applications.map((application) => (
        <Card key={application.id}>
          <div className="row space-between">
            <div>
              <h3>
                {application.user
                  ? `${application.user.firstName} ${application.user.lastName}`
                  : "Doctor application"}
              </h3>
              <p className="muted small">
                BMDC {application.bmdcNumber} · {application.experienceYears} years
              </p>
              {application.degrees && <p className="muted small">{application.degrees}</p>}
            </div>
            <Badge tone="warning">{application.applicationStatus.replaceAll("_", " ")}</Badge>
          </div>

          {rejectingId === application.id ? (
            <div className="filters">
              <Field label="Rejection reason" value={reason} onChange={setReason} required />
              <Button
                variant="danger"
                disabled={reason.trim().length < 3}
                onClick={() => void decide(application.id, "REJECTED", reason.trim())}
              >
                Confirm rejection
              </Button>
              <Button variant="secondary" onClick={() => setRejectingId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="row">
              <Button onClick={() => void decide(application.id, "APPROVED")}>Approve</Button>
              <Button variant="danger" onClick={() => setRejectingId(application.id)}>
                Reject
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
