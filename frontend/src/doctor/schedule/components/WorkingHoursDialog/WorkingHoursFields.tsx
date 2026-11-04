import { Link } from "react-router-dom";
import { Alert, Field, FormField, Select } from "../../../../shared/ui";
import { formatMoney } from "../../../../shared/utils/format";
import type { DoctorChamberDetail } from "../../../profile/types/doctorProfile.types";
import type { WorkingHoursFormValues } from "../../types/doctorSchedule.types";
import { scheduleDays } from "../../compact/scheduleView.model";
import styles from "../../compact/ScheduleView.module.css";

export function WorkingHoursFields({ values, onChange, chambers, videoFee, busy }: {
  values: WorkingHoursFormValues; onChange: (patch: Partial<WorkingHoursFormValues>) => void;
  chambers: DoctorChamberDetail[]; videoFee: number | null; busy: boolean;
}) {
  const chamber = chambers.find((item) => item.id === values.chamberId || item.hospitalId === values.chamberId);
  return <>
    <div className={styles.fields}>
      <FormField label="Day" required><Select value={values.dayOfWeek} disabled={busy}
        onChange={(event) => onChange({ dayOfWeek: Number(event.target.value) })}>
        {scheduleDays.map((day, index) => <option key={day} value={index}>{day}</option>)}
      </Select></FormField>
      <FormField label="Type" required><Select value={values.mode} disabled={busy}
        onChange={(event) => onChange({ mode: event.target.value as "VIDEO" | "CHAMBER" })}>
        <option value="VIDEO">Video</option><option value="CHAMBER">Chamber</option>
      </Select></FormField>
    </div>
    {values.mode === "CHAMBER" && <FormField label="Chamber" required>
      <Select required disabled={busy} value={values.chamberId} onChange={(event) => onChange({ chamberId: event.target.value })}>
        <option value="" disabled>Select chamber</option>
        {chambers.map((item) => <option key={item.id || item.hospitalId} value={item.id || item.hospitalId}>
          {item.hospital?.name || "Chamber"}{item.roomOrUnit ? ` · ${item.roomOrUnit}` : ""}
        </option>)}
      </Select>
    </FormField>}
    {values.mode === "VIDEO" && videoFee === null && <Alert kind="warning">Set a video fee in <Link to="/doctor/profile">Profile</Link> first.</Alert>}
    {values.mode === "CHAMBER" && !chambers.length && <Alert kind="warning">Add a chamber in <Link to="/doctor/profile">Profile</Link> first.</Alert>}
    {chamber && values.mode === "CHAMBER" && <p className={styles.muted}>
      {[chamber.hospital?.address, chamber.hospital?.area].filter(Boolean).join(" · ")}
      {` · Fee ${formatMoney(chamber.consultationFee)}`}
    </p>}
    {values.mode === "VIDEO" && videoFee !== null && <p className={styles.muted}>Video fee {formatMoney(videoFee)}</p>}
    <div className={styles.fields}>
      <Field label="Start" value={values.startTime} onChange={(startTime) => onChange({ startTime })} type="time" required disabled={busy} />
      <Field label="End" value={values.endTime} onChange={(endTime) => onChange({ endTime })} type="time" required disabled={busy} />
    </div>
    <FormField label="Appointment length" required><Select disabled={busy} value={values.slotDurationMinutes}
      onChange={(event) => onChange({ slotDurationMinutes: Number(event.target.value) })}>
      {[10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
    </Select></FormField>
  </>;
}
