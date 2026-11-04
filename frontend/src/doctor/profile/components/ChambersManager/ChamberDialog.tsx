import { useState } from "react";
import type { Hospital } from "../../../../shared/types";
import { Alert, Button, Dialog, DialogContent, Field, FormField, Input, Select } from "../../../../shared/ui";
import type { ChamberFormValues, DoctorChamberDetail } from "../../types/doctorProfile.types";
import styles from "../../workspace/ProfileWorkspace.module.css";

interface ChamberDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; hospitals: Hospital[];
  existingChambers: DoctorChamberDetail[]; editingChamber?: DoctorChamberDetail | null;
  onSave: (values: ChamberFormValues) => Promise<boolean | void>; isSaving?: boolean;
  onRemove?: () => void; catalogLoading?: boolean; catalogError?: string | null; onRetry?: () => void;
}
export function ChamberDialog(props: ChamberDialogProps) {
  return props.open ? <ChamberForm key={props.editingChamber?.hospitalId ?? "new"} {...props} /> : null;
}
function ChamberForm({ open, onOpenChange, hospitals, existingChambers, editingChamber, onSave, isSaving = false,
  onRemove, catalogLoading = false, catalogError, onRetry }: ChamberDialogProps) {
  const available = hospitals.filter((hospital) => editingChamber?.hospitalId === hospital.id ||
    !existingChambers.some((chamber) => chamber.hospitalId === hospital.id && chamber.isActive !== false));
  const [hospitalId, setHospitalId] = useState(editingChamber?.hospitalId ?? "");
  const [room, setRoom] = useState(editingChamber?.roomOrUnit ?? "");
  const [fee, setFee] = useState(String(editingChamber?.consultationFee ?? ""));
  const [error, setError] = useState<string | null>(null);
  const hospital = hospitals.find((item) => item.id === hospitalId) ?? editingChamber?.hospital;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    if (!hospitalId) { setError("Choose a hospital."); return; }
    if (!fee.trim() || !Number.isFinite(Number(fee)) || Number(fee) < 0 || Number(fee) > 1000000) {
      setError("Fee must be between 0 and 1,000,000 BDT."); return;
    }
    if (room.trim().length > 120) { setError("Keep the room or unit within 120 characters."); return; }
    try {
      if (await onSave({ hospitalId, roomOrUnit: room.trim(), consultationFee: fee }) !== false) onOpenChange(false);
    } catch { setError("Could not apply chamber changes."); }
  }
  const options = editingChamber?.hospital && !available.some((item) => item.id === editingChamber.hospitalId)
    ? [editingChamber.hospital, ...available] : available;
  return <Dialog open={open} onOpenChange={(next) => { if (!isSaving) onOpenChange(next); }}>
    <DialogContent title={editingChamber ? "Edit chamber" : "Add chamber"}
      description="Apply edits here, then save changes on your profile."
      footer={<div className={styles.actions}>
        {onRemove && <Button variant="danger" disabled={isSaving} onClick={onRemove}>Remove chamber</Button>}
        <Button variant="secondary" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" form="edit-chamber-form" loading={isSaving} disabled={catalogLoading && !editingChamber}>Apply changes</Button>
      </div>}>
      <form id="edit-chamber-form" className={styles.stack} onSubmit={submit}>
        {error && <Alert kind="error">{error}</Alert>}
        {catalogError && <Alert kind="warning">{catalogError}
          {onRetry && <Button size="sm" variant="ghost" disabled={catalogLoading} onClick={onRetry}>Retry catalogs</Button>}</Alert>}
        <FormField label="Hospital" required><Select value={hospitalId} required
          disabled={Boolean(editingChamber) || isSaving || catalogLoading} onChange={(event) => setHospitalId(event.target.value)}>
          <option value="" disabled>{catalogLoading ? "Loading hospitals…" : options.length ? "Choose a hospital" : "No available hospitals"}</option>
          {options.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.area}</option>)}
        </Select></FormField>
        {hospital?.address && <p className={styles.muted}>{hospital.address}</p>}
        <Field label="Room / unit" value={room} onChange={setRoom} disabled={isSaving} />
        <FormField label="Consultation fee (BDT)" required><Input type="number" min={0} max={1000000} step="0.01" required
          value={fee} disabled={isSaving} onChange={(event) => setFee(event.target.value)} /></FormField>
      </form>
    </DialogContent>
  </Dialog>;
}
