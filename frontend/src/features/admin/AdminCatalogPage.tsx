/**
 * Admin catalog management page for Specialties and Hospitals (create, toggle active, soft-delete).
 */

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../api/admin";
import { Alert, Badge, Button, Card, Field, Spinner } from "../../components/ui";
import { getErrorMessage } from "../../shared/utils/apiError";

interface AdminSpecialtyItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface AdminHospitalItem {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string;
  isActive: boolean;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCatalogPage() {
  const [specialties, setSpecialties] = useState<AdminSpecialtyItem[]>([]);
  const [hospitals, setHospitals] = useState<AdminHospitalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [specName, setSpecName] = useState("");
  const [hospName, setHospName] = useState("");
  const [hospArea, setHospArea] = useState("");
  const [hospAddress, setHospAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const [specRes, hospRes] = await Promise.all([
        adminApi.listSpecialties<AdminSpecialtyItem>(),
        adminApi.listHospitals<AdminHospitalItem>(),
      ]);
      setSpecialties(specRes.items);
      setHospitals(hospRes.items);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load catalog data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  async function handleCreateSpecialty(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.createSpecialty({ name: specName.trim(), slug: toSlug(specName) });
      setSpecName("");
      setNotice("Specialty created.");
      await loadCatalog();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not create specialty."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleSpecialty(item: AdminSpecialtyItem) {
    setBusy(true);
    setError(null);
    try {
      if (item.isActive) {
        await adminApi.deleteSpecialty(item.id);
      } else {
        await adminApi.updateSpecialty(item.id, { isActive: true });
      }
      await loadCatalog();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not update specialty."));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateHospital(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.createHospital({
        name: hospName.trim(),
        slug: toSlug(hospName),
        area: hospArea.trim(),
        address: hospAddress.trim(),
      });
      setHospName("");
      setHospArea("");
      setHospAddress("");
      setNotice("Hospital created.");
      await loadCatalog();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not create hospital."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleHospital(item: AdminHospitalItem) {
    setBusy(true);
    setError(null);
    try {
      if (item.isActive) {
        await adminApi.deleteHospital(item.id);
      } else {
        await adminApi.updateHospital(item.id, { isActive: true });
      }
      await loadCatalog();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not update hospital."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Loading catalog…" />;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Catalog management</h1>
        <p className="muted">Manage medical specialties and partner hospitals across Bangladesh.</p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <Card>
        <h2>Specialties ({specialties.length})</h2>
        <form
          onSubmit={handleCreateSpecialty}
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
                    onClick={() => void toggleSpecialty(s)}
                  >
                    {s.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2>Hospitals ({hospitals.length})</h2>
        <form
          onSubmit={handleCreateHospital}
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
                    onClick={() => void toggleHospital(h)}
                  >
                    {h.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
