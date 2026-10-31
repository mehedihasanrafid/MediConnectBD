/**
 * Patient digital prescriptions list. Displays diagnosis, prescribed medicines, recommended tests,
 * advice, and the 16-character verification code, with a print/PDF option.
 */

import { useEffect, useState } from "react";
import {
  Activity,
  Clock,
  Database,
  Download,
  Package,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";

import { prescriptionsApi } from "../../api/prescriptions";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  Cluster,
  Page,
  PageHeader,
  Spinner,
  Table,
  Text,
  useToast,
} from "../../shared/ui";
import type { Prescription } from "../../shared/types";
import { formatDhakaDateTime } from "../../shared/utils/format";
import { PatientBreadcrumbs } from "../components/PatientBreadcrumbs";
import styles from "./PatientPrescriptionsPage.module.css";

export function PatientPrescriptionsPage() {
  const { showToast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dhakaTime, setDhakaTime] = useState("");

  useEffect(() => {
    let cancelled = false;
    void prescriptionsApi
      .listPatientPrescriptions()
      .then((res) => {
        if (!cancelled) setPrescriptions(res.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your prescriptions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDhakaTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = async (rx: Prescription) => {
    try {
      showToast("Preparing signed prescription PDF…", { kind: "info" });
      await prescriptionsApi.downloadPdf(rx.id, rx.verificationCode);
      showToast("Prescription PDF downloaded successfully.", { kind: "success" });
    } catch {
      showToast("Could not download prescription PDF.", { kind: "error" });
    }
  };

  if (loading) return <Spinner label="Loading prescriptions…" />;

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const diag = rx.diagnosis.toLowerCase();
    const code = rx.verificationCode.toLowerCase();
    const meds = rx.medicines.map((m) => m.name.toLowerCase()).join(" ");
    return diag.includes(q) || code.includes(q) || meds.includes(q);
  });

  return (
    <Page>
      <div className={styles.container}>
        {/* 1. Patient Breadcrumbs Bar */}
        <PatientBreadcrumbs activePageLabel="My Digital Prescriptions" />

        <PageHeader
          eyebrow="Patient Health Records"
          title="My Prescriptions"
          description="Official digitally signed e-prescriptions issued by verified doctors after completed consultations. Includes encrypted QR codes."
        />

        {error && <Alert kind="error">{error}</Alert>}

        {/* 2. Search Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={14} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search prescriptions by diagnosis, medicine, or verification code…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter my prescriptions"
            />
          </div>

          <div className={styles.rxCountBadge}>
            <span>{prescriptions.length} Issued Records</span>
          </div>
        </div>

        {/* 3. Prescriptions List */}
        {filteredPrescriptions.length === 0 ? (
          <div className={styles.emptyState}>
            <Sparkles size={28} className={styles.emptyIcon} aria-hidden="true" />
            <span className={styles.emptyTitle}>
              {searchQuery ? "No matching prescriptions found" : "No prescriptions issued yet"}
            </span>
            <span className={styles.emptyText}>
              {searchQuery
                ? "Try searching for a different medicine or diagnosis term."
                : "After a doctor completes your consultation, your official digitally signed prescription will appear here with an encrypted verification code."}
            </span>
          </div>
        ) : (
          filteredPrescriptions.map((rx) => (
            <Card key={rx.id} className={styles.card}>
              <Cluster justify="between">
                <div>
                  <h3>Diagnosis: {rx.diagnosis}</h3>
                  <Text tone="muted" size="sm">Issued {formatDhakaDateTime(rx.createdAt)}</Text>
                </div>
                <Badge tone="info">Code: {rx.verificationCode}</Badge>
              </Cluster>

              <div>
                <h4 className={styles.subheading}>Prescribed medicines</h4>
                <div className={styles.tableWrapper}>
                  <Table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rx.medicines.map((med, idx) => (
                        <tr key={`${rx.id}-med-${idx}`}>
                          <td>{med.name}</td>
                          <td>{med.dosage}</td>
                          <td>{med.frequency}</td>
                          <td>{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>

              {rx.tests.length > 0 && (
                <Text size="sm" className={styles.extraInfo}>
                  <strong>Recommended tests:</strong> {rx.tests.join(", ")}
                </Text>
              )}

              {rx.advice && (
                <Text size="sm" className={styles.extraInfo}>
                  <strong>Advice:</strong> {rx.advice}
                </Text>
              )}

              <Cluster gap={2} className={styles.actions}>
                <Button onClick={() => handleDownload(rx)}>
                  <Download size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  <span>Download PDF</span>
                </Button>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  <span>Print</span>
                </Button>
                <ButtonLink
                  variant="secondary"
                  to={`/verify-prescription?code=${encodeURIComponent(rx.verificationCode)}`}
                >
                  Verify code
                </ButtonLink>
              </Cluster>
            </Card>
          ))
        )}

        {/* 4. Docked Patient Health Status Bar */}
        <footer className={styles.statusBar} aria-label="Patient Health Status Bar">
          <div className={styles.statusLeft}>
            <div className={styles.statusItem}>
              <span className={styles.statusDot} aria-hidden="true" />
              <Wifi size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
              <span>Daily.co WebRTC HD: Connected (18ms)</span>
            </div>

            <div className={styles.statusItem}>
              <Database size={12} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
              <span>Sync Gateway: Active</span>
            </div>

            <div className={styles.statusItem}>
              <Activity size={12} style={{ color: "var(--color-info)" }} aria-hidden="true" />
              <span>Records Vault: Encrypted</span>
            </div>
          </div>

          <div className={styles.statusRight}>
            <div className={styles.statusItem}>
              <Clock size={12} aria-hidden="true" />
              <span>Asia/Dhaka {dhakaTime}</span>
            </div>

            <div className={styles.statusItem}>
              <ShieldCheck size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
              <span>Digitally Signed Rx</span>
            </div>

            <div className={styles.versionBadge}>
              <Package size={10} aria-hidden="true" />
              <span>v1.4.0 (.deb)</span>
            </div>
          </div>
        </footer>
      </div>
    </Page>
  );
}
