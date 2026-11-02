import { useEffect, useState } from "react";
import type { Hospital } from "../../../../shared/types";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  Field,
  FormField,
  Select,
} from "../../../../shared/ui";
import type { ChamberFormValues, DoctorChamberDetail } from "../../types/doctorProfile.types";

interface ChamberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitals: Hospital[];
  existingChambers: DoctorChamberDetail[];
  editingChamber?: DoctorChamberDetail | null;
  onSave: (values: ChamberFormValues) => Promise<boolean | void>;
  isSaving?: boolean;
}

export function ChamberDialog({
  open,
  onOpenChange,
  hospitals,
  existingChambers,
  editingChamber,
  onSave,
  isSaving = false,
}: ChamberDialogProps) {
  const isEditing = Boolean(editingChamber);

  const [hospitalId, setHospitalId] = useState("");
  const [roomOrUnit, setRoomOrUnit] = useState("");
  const [consultationFee, setConsultationFee] = useState("1000");
  const [error, setError] = useState<string | null>(null);

  // Available hospitals: exclude hospitals that already have an active chamber (except when editing this chamber)
  const availableHospitals = hospitals.filter((h) => {
    if (isEditing && (editingChamber?.hospitalId === h.id || editingChamber?.hospital?.id === h.id)) {
      return true;
    }
    return !existingChambers.some(
      (c) => (c.hospitalId === h.id || c.hospital?.id === h.id) && c.isActive !== false,
    );
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      if (editingChamber) {
        setHospitalId(editingChamber.hospitalId || editingChamber.hospital?.id || "");
        setRoomOrUnit(editingChamber.roomOrUnit ?? "");
        setConsultationFee(String(editingChamber.consultationFee ?? "1000"));
      } else {
        setHospitalId(availableHospitals[0]?.id ?? "");
        setRoomOrUnit("");
        setConsultationFee("1000");
      }
    }
  }, [open, editingChamber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hospitalId) {
      setError("Please select a hospital from the catalog.");
      return;
    }

    const fee = Number(consultationFee);
    if (isNaN(fee) || fee < 0 || fee > 1000000) {
      setError("Consultation fee must be a valid number between 0 and 1,000,000 BDT.");
      return;
    }

    if (roomOrUnit.trim().length > 120) {
      setError("Room or unit identifier must not exceed 120 characters.");
      return;
    }

    try {
      const success = await onSave({
        hospitalId,
        roomOrUnit: roomOrUnit.trim(),
        consultationFee: String(fee),
      });

      if (success !== false) {
        onOpenChange(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save chamber.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEditing ? "Edit Practicing Chamber" : "Add Practicing Chamber"}
        description={
          isEditing
            ? "Update consultation fee and room details for this practicing location."
            : "Select a catalog hospital and configure in-person consultation details."
        }
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" loading={isSaving} onClick={handleSubmit}>
              {isEditing ? "Save Changes" : "Add Chamber"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert kind="error">{error}</Alert>}

          <FormField
            label="Practicing Hospital"
            hint={
              isEditing
                ? "Hospital location cannot be changed after creation. Remove and add a new chamber if changing hospitals."
                : "Select hospital from the verified catalog."
            }
            required
          >
            <Select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              disabled={isEditing || availableHospitals.length === 0}
              required
            >
              {availableHospitals.length === 0 ? (
                <option value="">No available hospitals in catalog</option>
              ) : (
                availableHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.area})
                  </option>
                ))
              )}
            </Select>
          </FormField>

          <Field
            label="Room / Unit / Department (Optional)"
            value={roomOrUnit}
            onChange={setRoomOrUnit}
            placeholder="e.g. Room 402, Level 4 (OPD Building)"
            hint="Specify where patients should report for consultation (max 120 chars)."
          />

          <Field
            label="In-Person Consultation Fee (BDT)"
            value={consultationFee}
            onChange={setConsultationFee}
            type="number"
            placeholder="1000"
            required
            hint="Standard consultation charge for this specific hospital chamber."
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
