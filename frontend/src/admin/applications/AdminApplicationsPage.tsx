/**
 * Admin doctor application review. Lists pending applications and allows approve or reject with a
 * reason, matching the backend admin endpoints.
 */

import { useCallback, useEffect, useState } from "react";
import { Alert } from "../../shared/ui/Alert";
import { api, ApiRequestError } from "../../shared/api";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { FormField, Input } from "../../shared/ui/Form";
import { Cluster } from "../../shared/ui/Layout";
import { Page, PageHeader } from "../../shared/ui/Page";
import { Spinner } from "../../shared/ui/Spinner";
import { Text } from "../../shared/ui/Text";
import styles from "./AdminApplicationsPage.module.css";

export interface DoctorApplication {
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

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ items: DoctorApplication[] }>("/admin/doctors/applications?status=PENDING_REVIEW")
      .then((result) => {
        if (!cancelled) setApplications(result.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load doctor applications.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function decide(
    doctorId: string,
    decision: "APPROVED" | "REJECTED",
    rejectionReason?: string,
  ) {
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
      setError(
        caught instanceof ApiRequestError ? caught.message : "Could not record the decision.",
      );
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Clinical Governance"
        title="Doctor applications"
        description="Review credentials and approve or reject pending applications."
      />

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner label="Loading applications…" />}
      {!loading && applications.length === 0 && (
        <EmptyState>No pending applications.</EmptyState>
      )}

      {applications.map((application) => (
        <Card key={application.id}>
          <div className={styles.cardHeader}>
            <div>
              <h3>
                {application.user
                  ? `${application.user.firstName} ${application.user.lastName}`
                  : "Doctor application"}
              </h3>
              <Text tone="muted" size="sm">
                BMDC {application.bmdcNumber} · {application.experienceYears} years
              </Text>
              {application.degrees && (
                <Text tone="muted" size="sm">
                  {application.degrees}
                </Text>
              )}
            </div>
            <Badge tone="warning">{application.applicationStatus.replaceAll("_", " ")}</Badge>
          </div>

          {rejectingId === application.id ? (
            <div className={styles.rejectionForm}>
              <FormField label="Rejection reason" required>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter rejection reason"
                  required
                />
              </FormField>
              <Cluster gap={2}>
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
              </Cluster>
            </div>
          ) : (
            <div className={styles.actionRow}>
              <Button onClick={() => void decide(application.id, "APPROVED")}>Approve</Button>
              <Button variant="danger" onClick={() => setRejectingId(application.id)}>
                Reject
              </Button>
            </div>
          )}
        </Card>
      ))}
    </Page>
  );
}
