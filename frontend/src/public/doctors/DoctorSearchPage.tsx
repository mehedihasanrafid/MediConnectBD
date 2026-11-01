/**
 * Public doctor directory with search and filters. Visitors can browse without signing in; the
 * booking action requires authentication.
 */

import { CheckCircle2, CreditCard, FileText, Shield, Video } from "lucide-react";
import { Alert, EmptyState, Grid, Page, Spinner } from "../../shared/ui";
import { DoctorCard } from "./components/DoctorCard";
import { DoctorSearchFilters } from "./components/DoctorSearchFilters";
import { useDoctorSearch } from "./hooks/useDoctorSearch";
import styles from "./DoctorSearchPage.module.css";

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
    total,
  } = useDoctorSearch();

  return (
    <Page>
      <section className={styles.hero} aria-label="Find verified doctors">
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <Shield size={14} aria-hidden="true" />
            <span>BMDC Verified Healthcare</span>
          </div>
          <h1 className={styles.heroTitle}>
            Find & Book the Right Doctor in Bangladesh
          </h1>
          <p className={styles.heroDescription}>
            Consult top specialists online or in-chamber. Search across certified doctors,
            partner hospitals, and areas in Dhaka and nationwide.
          </p>

          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>BMDC Verified Doctors</span>
            </div>
            <div className={styles.trustBadge}>
              <Video size={16} aria-hidden="true" />
              <span>Live Video & Chamber Slots</span>
            </div>
            <div className={styles.trustBadge}>
              <CreditCard size={16} aria-hidden="true" />
              <span>Transparent BDT Fees</span>
            </div>
            <div className={styles.trustBadge}>
              <FileText size={16} aria-hidden="true" />
              <span>Digital QR Prescriptions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Specialty Filter Pills */}
      {specialties.length > 0 && (
        <div className={styles.specialtyPills} role="group" aria-label="Filter by specialty">
          <button
            type="button"
            className={`${styles.pill}${!specialty ? ` ${styles.pillActive}` : ""}`}
            onClick={() => setSpecialty("")}
          >
            All Specialties
          </button>
          {specialties.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.pill}${specialty === item.slug ? ` ${styles.pillActive}` : ""}`}
              onClick={() => setSpecialty(specialty === item.slug ? "" : item.slug)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

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

      {!loading && !error && (
        <div className={styles.resultsHeader}>
          <p className={styles.resultsCount}>
            {total === 1
              ? "1 doctor available"
              : `${total} doctors available`}
          </p>
        </div>
      )}

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
