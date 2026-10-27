import { useState } from "react";

import { Badge, Button, Card, Field } from "../../../components/ui";
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
      <h2>Hospitals ({hospitals.length})</h2>
      <form
        onSubmit={handleSubmit}
        className="filters"
        style={{ marginBottom: "0.75rem" }}
      >
        <Field
          label="Hospital name"
          value={hospName}
          onChange={setHospName}
          placeholder="Square Hospital"
          required
        />
        <Field
          label="Area"
          value={hospArea}
          onChange={setHospArea}
          placeholder="Panthapath"
          required
        />
        <Field
          label="Address"
          value={hospAddress}
          onChange={setHospAddress}
          placeholder="18/F, Bir Uttam Qazi Nuruzzaman Sarak, Dhaka"
          required
        />
        <Button type="submit" disabled={busy}>
          Add hospital
        </Button>
      </form>

      <table className="table">
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
              <td className="muted small">
                {h.area} — {h.address}
              </td>
              <td>
                <Badge tone={h.isActive ? "success" : "neutral"}>
                  {h.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td>
                <Button
                  variant={h.isActive ? "danger" : "secondary"}
                  disabled={busy}
                  onClick={() => void onToggleHospital(h)}
                >
                  {h.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
