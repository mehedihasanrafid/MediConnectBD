/**
 * Public prescription verification page. Anyone (such as a pharmacy) can verify a 16-character
 * verification code without seeing private clinical diagnosis or medicines.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { prescriptionsApi } from "../../api/prescriptions";
import { Alert, Badge, Button, Card, Field, Page, PageHeader, Text } from "../../shared/ui";
import type { VerifyPrescriptionResponse } from "../../shared/types";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatDhakaDateTime } from "../../shared/utils/format";
import styles from "./VerifyPrescriptionPage.module.css";

export function VerifyPrescriptionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";

  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<VerifyPrescriptionResponse | null>(null);
  const [busy, setBusy] = useState(() => initialCode.trim().length === 16);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCode || initialCode.trim().length !== 16) return;
    let cancelled = false;
    void prescriptionsApi
      .verifyByCode(initialCode.trim().toUpperCase())
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Verification failed."));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 16) {
      setError("Verification code must be exactly 16 alphanumeric characters.");
      return;
    }
    setBusy(true);
    setError(null);
    setSearchParams({ code: normalized });
  }

  return (
    <Page className={styles.page}>
      <PageHeader
        eyebrow="Public Verification"
        title="Verify prescription"
        description="Enter a 16-character MediConnect BD verification code to confirm authenticity."
      />

      <Card className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Field
            label="Verification code (16 characters)"
            value={code}
            onChange={(value) => setCode(value.toUpperCase())}
            placeholder="e.g. A1B2C3D4E5F6G7H8"
            required
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Verifying…" : "Verify"}
          </Button>
        </form>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      {result && (
        <Card className={styles.resultCard}>
          {result.valid && result.prescription ? (
            <>
              <div className={styles.resultHeader}>
                <h3 className={styles.resultTitle}>Authentic MediConnect BD Prescription</h3>
                <Badge tone="success">Verified</Badge>
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>Verification Code</dt>
                  <dd className={styles.codeValue}>{result.prescription.verificationCode}</dd>
                </div>
                <div>
                  <dt>Prescribing Doctor</dt>
                  <dd>
                    {result.prescription.doctorName
                      ? `Dr. ${result.prescription.doctorName}`
                      : result.prescription.doctorProfileId}
                  </dd>
                </div>
                <div>
                  <dt>Issued At</dt>
                  <dd>{formatDhakaDateTime(result.prescription.issuedAt)}</dd>
                </div>
              </dl>
              <Text tone="muted" size="sm" className={styles.privacyNotice}>
                For patient privacy, clinical diagnosis and medication details are only visible to
                the patient and prescribing doctor.
              </Text>
            </>
          ) : (
            <Alert kind="error">
              Invalid verification code. No matching prescription was found.
            </Alert>
          )}
        </Card>
      )}
    </Page>
  );
}
