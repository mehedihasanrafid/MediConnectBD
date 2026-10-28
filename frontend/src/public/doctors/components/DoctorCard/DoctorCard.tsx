import { ArrowRight, Award, Building2, Languages, Star, Video } from "lucide-react";
import { Avatar, ButtonLink, Card, Text } from "../../../../shared/ui";
import { formatMoney } from "../../../../shared/format";
import type { PublicDoctor } from "../../../../shared/types";
import styles from "./DoctorCard.module.css";

interface DoctorCardProps {
  doctor: PublicDoctor;
}

/**
 * Summary card for a verified doctor in the public directory.
 */
export function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <Card className={styles.card}>
      <div>
        <div className={styles.head}>
          <Avatar name={`Dr. ${doctor.firstName} ${doctor.lastName}`} size="lg" />
          <div>
            <h2 className={styles.title}>
              Dr. {doctor.firstName} {doctor.lastName}
            </h2>
            <Text tone="muted">{doctor.specialties.map((s) => s.name).join(", ")}</Text>
          </div>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>
              <Award size={13} className={styles.factIcon} aria-hidden />
              Experience
            </dt>
            <dd>{doctor.experienceYears} years</dd>
          </div>
          <div>
            <dt>
              <Star size={13} className={styles.factIcon} aria-hidden />
              Rating
            </dt>
            <dd>
              {doctor.averageRating !== null && doctor.reviewCount > 0
                ? `★ ${doctor.averageRating.toFixed(1)} (${doctor.reviewCount})`
                : "No reviews yet"}
            </dd>
          </div>
          <div>
            <dt>
              <Video size={13} className={styles.factIcon} aria-hidden />
              Video fee
            </dt>
            <dd>{formatMoney(doctor.videoConsultationFee)}</dd>
          </div>
          <div>
            <dt>Chamber from</dt>
            <dd>{formatMoney(doctor.minimumFee)}</dd>
          </div>
          <div>
            <dt>
              <Languages size={13} className={styles.factIcon} aria-hidden />
              Languages
            </dt>
            <dd>{doctor.languages?.join(", ") ?? "—"}</dd>
          </div>
        </dl>

        {doctor.chambers.length > 0 && (
          <p className={styles.chamberInfo}>
            <Building2 size={14} aria-hidden />
            <Text tone="muted" size="sm" as="span">
              {doctor.chambers[0].hospital.name}, {doctor.chambers[0].hospital.area}
            </Text>
          </p>
        )}
      </div>

      <ButtonLink
        to={`/doctors/${doctor.id}`}
        fullWidth
        rightIcon={<ArrowRight size={16} />}
      >
        View slots
      </ButtonLink>
    </Card>
  );
}
