import { ArrowRight, Award, Building2, Languages, Star, Video } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "../../../../components/ui";
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
          <div className={styles.avatar}>
            {doctor.firstName[0]}
            {doctor.lastName[0]}
          </div>
          <div>
            <h2 className={styles.title}>
              Dr. {doctor.firstName} {doctor.lastName}
            </h2>
            <p className="muted">{doctor.specialties.map((s) => s.name).join(", ")}</p>
          </div>
        </div>

        <dl className={`facts ${styles.facts}`}>
          <div>
            <dt>
              <Award size={13} style={{ display: "inline", marginRight: 4 }} />
              Experience
            </dt>
            <dd>{doctor.experienceYears} years</dd>
          </div>
          <div>
            <dt>
              <Star size={13} style={{ display: "inline", marginRight: 4 }} />
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
              <Video size={13} style={{ display: "inline", marginRight: 4 }} />
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
              <Languages size={13} style={{ display: "inline", marginRight: 4 }} />
              Languages
            </dt>
            <dd>{doctor.languages?.join(", ") ?? "—"}</dd>
          </div>
        </dl>

        {doctor.chambers.length > 0 && (
          <p className={`muted small ${styles.chamberInfo}`}>
            <Building2 size={14} />
            <span>
              {doctor.chambers[0].hospital.name}, {doctor.chambers[0].hospital.area}
            </span>
          </p>
        )}
      </div>

      <Link
        className={`btn btn-primary ${styles.viewSlotsBtn}`}
        to={`/doctors/${doctor.id}`}
      >
        <span>View slots</span>
        <ArrowRight size={16} />
      </Link>
    </Card>
  );
}
