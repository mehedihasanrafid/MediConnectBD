/**
 * Family member management for the signed-in patient. Demonstrates the family-members API added
 * in T-P0-1: list, create, and delete.
 */

import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "../../shared/api";
import type { FamilyMember } from "../../shared/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Page,
  PageHeader,
  Spinner,
  Text,
} from "../../shared/ui";
import { PatientBreadcrumbs } from "../components/PatientBreadcrumbs";
import styles from "./FamilyMembersPage.module.css";

export function FamilyMembersPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.get<{ items: FamilyMember[] }>("/patients/me/family-members");
      setMembers(result.items);
    } catch {
      setError("Could not load family members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ items: FamilyMember[] }>("/patients/me/family-members")
      .then((result) => {
        if (!cancelled) setMembers(result.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load family members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post<FamilyMember>("/patients/me/family-members", {
        name: name.trim(),
        relationship: relationship.trim(),
        dateOfBirth: dateOfBirth || null,
      });
      setName("");
      setRelationship("");
      setDateOfBirth("");
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ? caught.message : "Could not add family member.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to remove this family member from your care circle?")) {
      return;
    }
    setError(null);
    setDeletingId(id);
    try {
      await api.delete(`/patients/me/family-members/${id}`);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Could not remove member.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Page>
      <div className={styles.container}>
        <PatientBreadcrumbs activePageLabel="Family Circle & Dependents" />

        <PageHeader
          eyebrow="PATIENT ACCOUNT & CARE CIRCLE"
          title="Family members & dependents"
          description="Manage dependent profiles to book doctor appointments, receive digital prescriptions, and coordinate healthcare on behalf of your children, parents, or spouse from one account."
        />

        {error && <Alert kind="error">{error}</Alert>}

        {/* Family Circle KPI Metrics */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Registered Dependents</span>
            <span className={styles.kpiValue}>{members.length} members</span>
            <span className={styles.kpiSubtext}>Linked to your primary patient account</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Care Booking Access</span>
            <span className={styles.kpiValue}>Enabled</span>
            <span className={styles.kpiSubtext}>Selectable during appointment checkout</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Data Privacy</span>
            <span className={styles.kpiValue}>Family Vault</span>
            <span className={styles.kpiSubtext}>Managed exclusively by account owner</span>
          </div>
        </div>

        {/* Add Family Member Card */}
        <Card className={styles.formCard}>
          <h2>Add a family member</h2>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formField}>
              <Field
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="e.g. Ayesha Rahman"
                required
              />
            </div>
            <div className={styles.formField}>
              <Field
                label="Relationship"
                value={relationship}
                onChange={setRelationship}
                placeholder="child, parent, spouse"
                required
              />
            </div>
            <div className={styles.formField}>
              <Field
                label="Date of birth (optional)"
                value={dateOfBirth}
                onChange={setDateOfBirth}
                type="date"
              />
            </div>
            <div className={styles.formActions}>
              <Button type="submit" disabled={busy || !name.trim() || !relationship.trim()}>
                {busy ? "Adding…" : "Add Member"}
              </Button>
            </div>
          </form>
        </Card>

        {loading && <Spinner label="Loading family members…" />}
        {!loading && members.length === 0 && (
          <EmptyState>
            No family members added yet. Fill out the form above to add your first dependent.
          </EmptyState>
        )}

        {/* Responsive Member Cards */}
        <div className={styles.membersGrid}>
          {members.map((member) => {
            const initial = member.name.charAt(0).toUpperCase() || "M";
            return (
              <div key={member.id} className={styles.memberCard}>
                <div className={styles.memberTop}>
                  <div className={styles.avatar}>{initial}</div>
                  <div className={styles.memberInfo}>
                    <h3 className={styles.memberName} title={member.name}>
                      {member.name}
                    </h3>
                    <div className={styles.memberMeta}>
                      <Text tone="muted" size="sm">
                        {member.relationship}
                        {member.dateOfBirth ? ` · born ${member.dateOfBirth}` : ""}
                        {member.phone ? ` · ${member.phone}` : ""}
                      </Text>
                    </div>
                  </div>
                  <Badge tone="info">{member.relationship.toUpperCase()}</Badge>
                </div>

                <div className={styles.memberBottom}>
                  <Text tone="subtle" size="sm">
                    ID: {member.id.slice(0, 8)}…
                  </Text>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deletingId === member.id}
                    onClick={() => void handleDelete(member.id)}
                  >
                    {deletingId === member.id ? "Removing…" : "Remove"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Docked Health Status Bar */}
        <div className={styles.statusBar} role="status" aria-label="Family circle status bar">
          <div className={styles.statusLeft}>
            <span className={styles.statusPill}>
              <span className={styles.pulseDot} />
              <span>Family Circle: Synced</span>
            </span>
            <span>·</span>
            <span>{members.length} registered dependents</span>
          </div>
          <div className={styles.statusRight}>
            <span>Proxy Booking &amp; Prescription Access Active</span>
          </div>
        </div>
      </div>
    </Page>
  );
}
