/**
 * Public doctor directory with search and filters. Visitors can browse without signing in; the
 * booking action requires authentication.
 */

import { Alert, EmptyState, Grid, Page, PageHeader, Spinner } from "../../shared/ui";
import { DoctorCard } from "./components/DoctorCard";
import { DoctorSearchFilters } from "./components/DoctorSearchFilters";
import { useDoctorSearch } from "./hooks/useDoctorSearch";

export function DoctorSearchPage() {
  const {
    doctors,
    specialties,
    hospitals,
    search,
    setSearch,
    specialty,
    setSpecialty,
    hospital,
    setHospital,
    area,
    setArea,
    minFee,
    setMinFee,
    maxFee,
    setMaxFee,
    clearFilters,
    hasActiveFilters,
    loading,
    error,
  } = useDoctorSearch();

  return (
    <Page>
      <PageHeader
        eyebrow="Public Directory"
        title="Find a doctor"
        description="Search by doctor name, specialty, hospital, area, or consultation fee."
      />

      <DoctorSearchFilters
        search={search}
        onSearchChange={setSearch}
        specialty={specialty}
        onSpecialtyChange={setSpecialty}
        specialties={specialties}
        hospital={hospital}
        onHospitalChange={setHospital}
        hospitals={hospitals}
        area={area}
        onAreaChange={setArea}
        minFee={minFee}
        onMinFeeChange={setMinFee}
        maxFee={maxFee}
        onMaxFeeChange={setMaxFee}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner label="Loading doctors…" />}

      {!loading && doctors.length === 0 && !error && (
        <EmptyState>No doctors match your search.</EmptyState>
      )}

      <Grid min="320px" gap={5}>
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </Grid>
    </Page>
  );
}
