import { useState } from "react";

import { Badge, Button, Card, Field } from "../../../components/ui";
import type { AdminSpecialtyItem } from "../hooks/useAdminCatalog";

interface SpecialtiesPanelProps {
  specialties: AdminSpecialtyItem[];
  busy: boolean;
  onCreateSpecialty: (name: string) => Promise<boolean>;
  onToggleSpecialty: (item: AdminSpecialtyItem) => Promise<void>;
}

export function SpecialtiesPanel({
  specialties,
  busy,
  onCreateSpecialty,
  onToggleSpecialty,
}: SpecialtiesPanelProps) {
  const [specName, setSpecName] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const ok = await onCreateSpecialty(specName);
    if (ok) setSpecName("");
  }

  return (
    <Card>
      <h2>Specialties ({specialties.length})</h2>
      <form
        onSubmit={handleSubmit}
        className="filters"
        style={{ marginBottom: "0.75rem" }}
      >
        <Field
          label="New specialty name"
          value={specName}
          onChange={setSpecName}
          placeholder="e.g. Neurology"
          required
        />
        <Button type="submit" disabled={busy}>
          Add specialty
        </Button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {specialties.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td className="muted small">{s.slug}</td>
              <td>
                <Badge tone={s.isActive ? "success" : "neutral"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td>
                <Button
                  variant={s.isActive ? "danger" : "secondary"}
                  disabled={busy}
                  onClick={() => void onToggleSpecialty(s)}
                >
                  {s.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
