import { Avatar, Card, Text } from "../../../../shared/ui";
import type { PublicDoctor, Review } from "../../../../shared/types";
import { formatMoney } from "../../../../shared/utils/format";
import { calculateAverageRating } from "../../utils/doctorSearch.utils";
import styles from "./DoctorProfileHeader.module.css";

interface DoctorProfileHeaderProps {
  doctor: PublicDoctor;
  reviews: Review[];
}

/**
 * Displays the doctor's public profile header, credentials, fees, and chambers.
 */
export function DoctorProfileHeader({ doctor, reviews }: DoctorProfileHeaderProps) {
  const avgRating = calculateAverageRating(reviews);

  return (
    <Card className={styles.container}>
      <div className={styles.head}>
        <Avatar name={`Dr. ${doctor.firstName} ${doctor.lastName}`} size="xl" />
        <div>
          <h1 className={styles.title}>
            Dr. {doctor.firstName} {doctor.lastName}
          </h1>
          <Text tone="muted">{doctor.specialties.map((s) => s.name).join(", ")}</Text>
          <Text tone="muted" size="sm">
            {doctor.degrees ?? "—"} · {doctor.experienceYears} years experience
            {avgRating ? ` · ★ ${avgRating} (${reviews.length} reviews)` : ""}
          </Text>
        </div>
      </div>
      {doctor.bio && <p>{doctor.bio}</p>}
      <dl className={styles.facts}>
        <div>
          <dt>Video consultation</dt>
          <dd>{formatMoney(doctor.videoConsultationFee)}</dd>
        </div>
        <div>
          <dt>Languages</dt>
          <dd>{doctor.languages?.join(", ") ?? "—"}</dd>
        </div>
      </dl>
      {doctor.chambers.length > 0 && (
        <div className={styles.chambersList}>
          {doctor.chambers.map((chamber) => (
            <Text key={chamber.id} tone="muted" size="sm">
              {chamber.hospital.name}, {chamber.hospital.area} — {formatMoney(chamber.consultationFee)}
            </Text>
          ))}
        </div>
      )}
    </Card>
  );
}
