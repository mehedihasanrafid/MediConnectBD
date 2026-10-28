/**
 * Public doctor directory with search and filters. Visitors can browse without signing in; the
 * booking action requires authentication.
 */

import { Alert, EmptyState, Spinner } from "../../components/ui";
import { DoctorCard } from "./components/DoctorCard";
import { DoctorSearchFilters } from "./components/DoctorSearchFilters";
import styles from "./DoctorSearchPage.module.css";
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
    <div className={`page ${styles.page}`}>
      <header className={`page-header ${styles.header}`}>
        <p className="eyebrow">Public Directory</p>
        <h1>Find a doctor</h1>
        <p className="muted">
          Search by doctor name, specialty, hospital, area, or consultation fee.
        </p>
      </header>

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

      <div className={`grid ${styles.grid}`}>
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </div>
  );
}
