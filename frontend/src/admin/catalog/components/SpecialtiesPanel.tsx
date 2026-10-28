import { useState } from "react";

import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { FormField, Input } from "../../../shared/ui/Form";
import { Table } from "../../../shared/ui/Table";
import { Text } from "../../../shared/ui/Text";
import styles from "../AdminCatalog.module.css";
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
      <h2 className={styles.title}>Specialties ({specialties.length})</h2>
      <form onSubmit={handleSubmit} className={styles.catalogForm}>
        <FormField label="New specialty name" required>
          <Input
            value={specName}
            onChange={(e) => setSpecName(e.target.value)}
            placeholder="e.g. Neurology"
            required
          />
        </FormField>
        <Button type="submit" disabled={busy}>
          Add specialty
        </Button>
      </form>

      <Table>
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
              <td>
                <Text tone="muted" size="sm">
                  {s.slug}
                </Text>
              </td>
              <td>
                <Badge tone={s.isActive ? "success" : "neutral"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td>
                <Button
                  variant={s.isActive ? "danger" : "secondary"}
                  size="sm"
                  disabled={busy}
                  onClick={() => void onToggleSpecialty(s)}
                >
                  {s.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
