/**
 * Admin catalog management page for Specialties and Hospitals (create, toggle active, soft-delete).
 */

import { Alert, Spinner } from "../../components/ui";
import { HospitalsPanel } from "./components/HospitalsPanel";
import { SpecialtiesPanel } from "./components/SpecialtiesPanel";
import { useAdminCatalog } from "./hooks/useAdminCatalog";

export function AdminCatalogPage() {
  const {
    specialties,
    hospitals,
    loading,
    error,
    notice,
    busy,
    createSpecialty,
    toggleSpecialty,
    createHospital,
    toggleHospital,
  } = useAdminCatalog();

  if (loading) return <Spinner label="Loading catalog…" />;

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Clinical Governance</p>
        <h1>Catalog management</h1>
        <p className="muted">
          Manage medical specialties and partner hospitals across Bangladesh.
        </p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <SpecialtiesPanel
        specialties={specialties}
        busy={busy}
        onCreateSpecialty={createSpecialty}
        onToggleSpecialty={toggleSpecialty}
      />

      <HospitalsPanel
        hospitals={hospitals}
        busy={busy}
        onCreateHospital={createHospital}
        onToggleHospital={toggleHospital}
      />
    </div>
  );
}
