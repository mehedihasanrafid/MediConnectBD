import { Building2, Eye, ShieldCheck, Video } from "lucide-react";
import type { Hospital, Specialty } from "../../../../shared/types";
import { Badge } from "../../../../shared/ui";
import { formatMoney } from "../../../../shared/utils/format";
import type { DoctorChamberDetail, DoctorProfileData } from "../../types/doctorProfile.types";
import styles from "./PublicProfilePreview.module.css";

interface PublicProfilePreviewProps {
  profile: DoctorProfileData;
  degrees: string;
  experienceYears: number;
  bio: string;
  languages: string[];
  videoConsultationFee: string;
  specialties: Specialty[];
  selectedSpecialtyIds: string[];
  chambers: DoctorChamberDetail[];
  hospitals: Hospital[];
}

export function PublicProfilePreview({
  profile,
  degrees,
  experienceYears,
  bio,
  languages,
  videoConsultationFee,
  specialties,
  selectedSpecialtyIds,
  chambers,
  hospitals,
}: PublicProfilePreviewProps) {
  const activeSpecialties = specialties.filter((s) => selectedSpecialtyIds.includes(s.id));
  const activeChambers = chambers.filter((c) => c.isActive !== false);

  const fullName = `Dr. ${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Doctor Profile";
  const initials = `${profile.firstName?.[0] ?? "D"}${profile.lastName?.[0] ?? "R"}`.toUpperCase();

  const videoFeeNum = videoConsultationFee.trim() !== "" ? Number(videoConsultationFee) : null;

  return (
    <aside className={styles.previewCard} aria-label="Public Doctor Profile Live Preview">
      <div className={styles.previewWatermark}>
        <span className={styles.watermarkLabel}>
          <Eye size={14} aria-hidden="true" />
          <span>Live Patient Preview</span>
        </span>
        <Badge tone="warning">Preview Only</Badge>
      </div>

      {/* Doctor Header */}
      <div className={styles.doctorHeader}>
        <div className={styles.avatar} aria-hidden="true">
          {initials}
        </div>
        <div className={styles.doctorMeta}>
          <h3 className={styles.doctorName}>{fullName}</h3>
          <span className={styles.doctorDegrees}>
            {degrees.trim() || "Degrees not provided"}
          </span>
          <span className={styles.bmdcTag}>
            <ShieldCheck size={11} aria-hidden="true" />
            <span>{`BMDC #${profile.bmdcNumber}`}</span>
            {experienceYears > 0 && <span>{`· ${experienceYears} yrs experience`}</span>}
          </span>
        </div>
      </div>

      {/* Specialties */}
      <div className={styles.specialtiesRow}>
        {activeSpecialties.length === 0 ? (
          <span className={styles.specBadge}>General Practitioner</span>
        ) : (
          activeSpecialties.map((spec) => (
            <span key={spec.id} className={styles.specBadge}>
              {spec.name}
            </span>
          ))
        )}
      </div>

      {/* Bio */}
      <div className={styles.bioBlock}>
        {bio.trim() || "No professional biography provided yet."}
      </div>

      {/* Pricing Summary */}
      <div className={styles.pricingBlock}>
        <div className={styles.priceItem}>
          <span className={styles.priceLabel}>
            <Video size={10} style={{ display: "inline", marginRight: "3px" }} aria-hidden="true" />
            Video Consult
          </span>
          <span className={styles.priceValue}>
            {videoFeeNum !== null && !isNaN(videoFeeNum) ? formatMoney(videoFeeNum) : "Not offered"}
          </span>
        </div>

        <div className={styles.priceItem}>
          <span className={styles.priceLabel}>
            <Building2 size={10} style={{ display: "inline", marginRight: "3px" }} aria-hidden="true" />
            Chambers
          </span>
          <span className={styles.priceValue}>
            {activeChambers.length} {activeChambers.length === 1 ? "Location" : "Locations"}
          </span>
        </div>
      </div>

      {/* Languages */}
      {languages.length > 0 && (
        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-secondary)" }}>
          <strong>Languages:</strong> {languages.join(", ")}
        </div>
      )}

      {/* Chamber Locations */}
      <div className={styles.chambersBlock}>
        <h4 className={styles.chambersTitle}>Consultation Chambers</h4>
        {activeChambers.length === 0 ? (
          <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
            No physical chambers registered.
          </div>
        ) : (
          activeChambers.map((chamber) => {
            const hospital = chamber.hospital ?? hospitals.find((h) => h.id === chamber.hospitalId);
            return (
              <div key={chamber.id ?? chamber.hospitalId} className={styles.chamberItem}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={styles.chamberHospital}>{hospital?.name ?? "Hospital Chamber"}</span>
                  <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-primary)" }}>
                    {formatMoney(chamber.consultationFee)}
                  </span>
                </div>
                <span className={styles.chamberMeta}>
                  {hospital?.area ? `${hospital.area} · ` : ""}
                  {chamber.roomOrUnit || "Room details on booking"}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.noticeFooter}>
        This is a live preview of your verified public listing. Ratings, verified badge, and live
        booking slots only appear once approved by MediConnect BD administrators.
      </div>
    </aside>
  );
}
