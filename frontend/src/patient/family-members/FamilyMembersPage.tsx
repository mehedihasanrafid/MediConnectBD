/**
 * Family member management for the signed-in patient. Demonstrates the family-members API added
 * in T-P0-1: list, create, and delete.
 */

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, EmptyState, Field, Spinner } from "../../components/ui";
import { api, ApiRequestError } from "../../shared/api";
import type { FamilyMember } from "../../shared/types";

export function FamilyMembersPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [busy, setBusy] = useState(false);

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
        name,
        relationship,
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
    setError(null);
    try {
      await api.delete(`/patients/me/family-members/${id}`);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Could not remove member.");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Patient Account</p>
        <h1>Family members</h1>
        <p className="muted">Book appointments on behalf of a parent or child from one account.</p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}

      <Card>
        <h2>Add a family member</h2>
        <form onSubmit={handleCreate} className="filters">
          <Field label="Name" value={name} onChange={setName} required />
          <Field
            label="Relationship"
            value={relationship}
            onChange={setRelationship}
            placeholder="child, parent, spouse"
            required
          />
          <Field label="Date of birth" value={dateOfBirth} onChange={setDateOfBirth} type="date" />
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add member"}
          </Button>
        </form>
      </Card>

      {loading && <Spinner label="Loading family members…" />}
      {!loading && members.length === 0 && <EmptyState>No family members added yet.</EmptyState>}

      {members.map((member) => (
        <Card key={member.id}>
          <div className="row space-between">
            <div>
              <h3>{member.name}</h3>
              <p className="muted small">
                {member.relationship}
                {member.dateOfBirth ? ` · born ${member.dateOfBirth}` : ""}
                {member.phone ? ` · ${member.phone}` : ""}
              </p>
            </div>
            <Button variant="danger" onClick={() => void handleDelete(member.id)}>
              Remove
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
