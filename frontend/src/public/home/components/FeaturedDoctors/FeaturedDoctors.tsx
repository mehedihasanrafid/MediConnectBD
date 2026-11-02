import { Link } from "react-router-dom";
import { ArrowRight, Building2, MapPin, Video } from "lucide-react";
import type { PublicDoctor } from "../../../../shared/types";
import { Alert, Avatar, Container, EmptyState } from "../../../../shared/ui";
import { formatMoney } from "../../../../shared/format";
import { getDoctorPhotoUrl } from "../../hooks/useHomeData";
import styles from "./FeaturedDoctors.module.css";

interface FeaturedDoctorsProps {
  doctors: PublicDoctor[];
  loading: boolean;
  error: string | null;
}

export function FeaturedDoctors({ doctors, loading, error }: FeaturedDoctorsProps) {
  return (
    <section className={styles.section} aria-labelledby="home-featured-doctors-heading">
      <Container size="lg">
        <div className={styles.header}>
          <h2 id="home-featured-doctors-heading" className={styles.title}>
            Featured doctors
          </h2>
          <Link to="/doctors" className={styles.viewAllLink}>
            <span>View all doctors</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {error && (
          <Alert kind="error">
            {error}{" "}
            <Link to="/doctors" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
              Browse doctor directory
            </Link>
          </Alert>
        )}

        {loading && (
          <div className={styles.grid} aria-busy="true" aria-label="Loading doctors">
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeletonCard}>
                <div className={styles.skeletonHeader}>
                  <div className={styles.skeletonAvatar} />
                  <div className={styles.skeletonMeta}>
                    <div className={styles.skeletonLine} style={{ width: "70%" }} />
                    <div className={styles.skeletonLine} style={{ width: "45%" }} />
                  </div>
                </div>
                <div className={styles.skeletonLine} style={{ width: "90%" }} />
                <div className={styles.skeletonLine} style={{ width: "40%", marginTop: "auto" }} />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && doctors.length === 0 && (
          <EmptyState>
            No doctors are currently available.{" "}
            <Link to="/doctors" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
              Explore the doctor directory
            </Link>
          </EmptyState>
        )}

        {!loading && !error && doctors.length > 0 && (
          <div className={styles.grid}>
            {doctors.slice(0, 3).map((doctor) => {
              const fullName = `Dr. ${doctor.firstName} ${doctor.lastName}`;
              const photo = getDoctorPhotoUrl(doctor);
              const specialtiesList = doctor.specialties.map((s) => s.name).join(", ");
              const firstChamber = doctor.chambers?.[0];
              const locationArea =
                firstChamber?.hospital?.area || firstChamber?.hospital?.name || null;
              const hasChamber = doctor.chambers && doctor.chambers.length > 0;
              const hasVideo = doctor.videoConsultationFee !== null;
              const fee = doctor.minimumFee ?? doctor.videoConsultationFee;

              return (
                <div key={doctor.id} className={styles.card}>
                  <div className={styles.doctorTop}>
                    <div className={styles.avatar}>
                      <Avatar name={fullName} src={photo} size="lg" />
                    </div>

                    <div className={styles.doctorMeta}>
                      <h3 className={styles.doctorName}>{fullName}</h3>
                      {specialtiesList && (
                        <span className={styles.specialties} title={specialtiesList}>
                          {specialtiesList}
                        </span>
                      )}

                      {locationArea && (
                        <div className={styles.locationRow}>
                          <MapPin size={13} className={styles.locationIcon} aria-hidden="true" />
                          <span>{locationArea}</span>
                        </div>
                      )}

                      <div className={styles.pillsRow}>
                        {hasChamber && (
                          <span className={styles.modePill}>
                            <Building2 size={12} aria-hidden="true" />
                            <span>Chamber</span>
                          </span>
                        )}
                        {hasVideo && (
                          <span className={styles.modePill}>
                            <Video size={12} aria-hidden="true" />
                            <span>Video</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {fee !== null && fee !== undefined && (
                    <div className={styles.feeSection}>
                      <span className={styles.feeLabel}>Consultation from</span>
                      <span className={styles.feeValue}>{formatMoney(fee)}</span>
                    </div>
                  )}

                  <Link to={`/doctors/${doctor.id}`} className={styles.profileButton}>
                    View profile
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}
