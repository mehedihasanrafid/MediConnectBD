/**
 * Admin catalog management page for Specialties and Hospitals (create, toggle active, soft-delete).
 */

import { Alert } from "../../shared/ui/Alert";
import { Page, PageHeader } from "../../shared/ui/Page";
import { Spinner } from "../../shared/ui/Spinner";
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
    <Page>
      <PageHeader
        eyebrow="Clinical Governance"
        title="Catalog management"
        description="Manage medical specialties and partner hospitals across Bangladesh."
      />

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
    </Page>
  );
}
