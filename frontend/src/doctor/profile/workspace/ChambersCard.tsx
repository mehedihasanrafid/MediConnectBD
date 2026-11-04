import { Button } from "../../../shared/ui";
import { formatMoney } from "../../../shared/utils/format";
import type { DoctorChamberDetail } from "../types/doctorProfile.types";
import type { Hospital } from "../../../shared/types";
import styles from "./ProfileWorkspace.module.css";

export function ChambersCard({ chambers, hospitals, disabled, onEdit }: {
  chambers: DoctorChamberDetail[]; hospitals: Hospital[]; disabled: boolean;
  onEdit: (chamber: DoctorChamberDetail | null) => void;
}) {
  return <section className={styles.card} aria-labelledby="profile-chambers-title">
    <div className={styles.row}><h2 id="profile-chambers-title">Chambers</h2>
      <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onEdit(null)}>+ Chamber</Button></div>
    {!chambers.length ? <p className={styles.muted}>No chambers added.</p> :
      <div className={styles.chambers}>{chambers.map((chamber) => {
        const hospital = chamber.hospital ?? hospitals.find((item) => item.id === chamber.hospitalId);
        return <div className={styles.chamber} key={chamber.hospitalId}>
          <div><h3>{hospital?.name ?? "Hospital chamber"}</h3>
            <p className={styles.muted}>{[hospital?.area, chamber.roomOrUnit].filter(Boolean).join(" · ") || "Room not specified"}</p>
          </div>
          <div className={styles.actions}><strong>{formatMoney(chamber.consultationFee)}</strong>
            <Button size="sm" variant="ghost" disabled={disabled} aria-label={`Edit chamber at ${hospital?.name ?? "hospital"}`}
              onClick={() => onEdit(chamber)}>Edit</Button></div>
        </div>;
      })}</div>}
  </section>;
}
