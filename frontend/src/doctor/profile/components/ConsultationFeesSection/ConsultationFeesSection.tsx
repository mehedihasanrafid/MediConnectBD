import { Building2, Video } from "lucide-react";
import { Field } from "../../../../shared/ui";
import { formatMoney } from "../../../../shared/utils/format";
import type { DoctorChamberDetail } from "../../types/doctorProfile.types";
import styles from "./ConsultationFeesSection.module.css";

interface ConsultationFeesSectionProps {
  videoConsultationFee: string;
  setVideoConsultationFee: (val: string) => void;
  chambers: DoctorChamberDetail[];
  isReadOnly?: boolean;
}

export function ConsultationFeesSection({
  videoConsultationFee,
  setVideoConsultationFee,
  chambers,
  isReadOnly = false,
}: ConsultationFeesSectionProps) {
  const activeChambers = chambers.filter((c) => c.isActive !== false);

  return (
    <section className={styles.section} aria-label="Consultation Fees and Telemedicine">
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>Consultation Fees &amp; Telemedicine</h2>
          <p className={styles.subheading}>
            Set your charges for online video consultations and review chamber consultation fees.
          </p>
        </div>
      </div>

      <div className={styles.feesGrid}>
        {/* Video Consultation Card */}
        <div className={styles.feeCard}>
          <div className={styles.cardTop}>
            <div className={styles.iconWrap} aria-hidden="true">
              <Video size={16} />
            </div>
            <span>Telemedicine Video Consultations</span>
          </div>

          <p className={styles.cardDescription}>
            Standard fee for remote video consultations via Daily.co clinical calls. Leave blank if
            you do not wish to offer online appointments.
          </p>

          <Field
            label="Video Consultation Fee (BDT)"
            value={videoConsultationFee}
            onChange={(val) => {
              if (val === "") {
                setVideoConsultationFee("");
                return;
              }
              const num = Number(val);
              if (!isNaN(num) && num >= 0 && num <= 1000000) {
                setVideoConsultationFee(val);
              }
            }}
            type="number"
            placeholder="e.g. 800"
            disabled={isReadOnly}
            hint="Amount in Bangladeshi Taka (BDT) per completed remote video visit."
          />
        </div>

        {/* Chamber Consultation Fees Summary */}
        <div className={styles.feeCard}>
          <div className={styles.cardTop}>
            <div className={styles.iconWrap} aria-hidden="true">
              <Building2 size={16} />
            </div>
            <span>In-Person Chamber Fees</span>
          </div>

          <p className={styles.cardDescription}>
            Chamber consultation fees are configured per practicing hospital in the Practicing
            Chambers section above.
          </p>

          {activeChambers.length === 0 ? (
            <div className={styles.noChambersNotice}>
              No active physical chambers configured yet.
            </div>
          ) : (
            <div className={styles.chamberFeesList}>
              {activeChambers.map((chamber) => {
                const name = chamber.hospital?.name ?? "Hospital Chamber";
                return (
                  <div key={chamber.id ?? chamber.hospitalId} className={styles.chamberFeeRow}>
                    <span className={styles.chamberFeeName}>{name}</span>
                    <span className={styles.chamberFeeAmount}>
                      {formatMoney(chamber.consultationFee)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
