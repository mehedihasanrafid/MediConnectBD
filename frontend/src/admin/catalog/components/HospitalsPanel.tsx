import { useState } from "react";

import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { FormField, Input } from "../../../shared/ui/Form";
import { Table } from "../../../shared/ui/Table";
import { Text } from "../../../shared/ui/Text";
import styles from "../AdminCatalog.module.css";
import type { AdminHospitalItem } from "../hooks/useAdminCatalog";

interface HospitalsPanelProps {
  hospitals: AdminHospitalItem[];
  busy: boolean;
  onCreateHospital: (input: {
    name: string;
    area: string;
    address: string;
  }) => Promise<boolean>;
  onToggleHospital: (item: AdminHospitalItem) => Promise<void>;
}

export function HospitalsPanel({
  hospitals,
  busy,
  onCreateHospital,
  onToggleHospital,
}: HospitalsPanelProps) {
  const [hospName, setHospName] = useState("");
  const [hospArea, setHospArea] = useState("");
  const [hospAddress, setHospAddress] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const ok = await onCreateHospital({
      name: hospName,
      area: hospArea,
      address: hospAddress,
    });
    if (ok) {
      setHospName("");
      setHospArea("");
      setHospAddress("");
    }
  }

  return (
    <Card>
      <h2 className={styles.title}>Hospitals ({hospitals.length})</h2>
      <form onSubmit={handleSubmit} className={styles.catalogForm}>
        <FormField label="Hospital name" required>
          <Input
            value={hospName}
            onChange={(e) => setHospName(e.target.value)}
            placeholder="Square Hospital"
            required
          />
        </FormField>
        <FormField label="Area" required>
          <Input
            value={hospArea}
            onChange={(e) => setHospArea(e.target.value)}
            placeholder="Panthapath"
            required
          />
        </FormField>
        <FormField label="Address" required>
          <Input
            value={hospAddress}
            onChange={(e) => setHospAddress(e.target.value)}
            placeholder="18/F, Bir Uttam Qazi Nuruzzaman Sarak, Dhaka"
            required
          />
        </FormField>
        <Button type="submit" disabled={busy}>
          Add hospital
        </Button>
      </form>

      <Table>
        <thead>
          <tr>
            <th>Hospital</th>
            <th>Area & Address</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {hospitals.map((h) => (
            <tr key={h.id}>
              <td>{h.name}</td>
              <td>
                <Text tone="muted" size="sm">
                  {h.area} — {h.address}
                </Text>
              </td>
              <td>
                <Badge tone={h.isActive ? "success" : "neutral"}>
                  {h.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td>
                <Button
                  variant={h.isActive ? "danger" : "secondary"}
                  size="sm"
                  disabled={busy}
                  onClick={() => void onToggleHospital(h)}
                >
                  {h.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
