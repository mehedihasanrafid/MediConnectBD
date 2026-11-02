import { useState } from "react";
import { Building2, Edit2, MapPin, Plus, Trash2 } from "lucide-react";
import type { Hospital } from "../../../../shared/types";
import { Alert, Badge, Button } from "../../../../shared/ui";
import { formatMoney } from "../../../../shared/utils/format";
import type { ChamberFormValues, DoctorChamberDetail } from "../../types/doctorProfile.types";
import { ChamberDialog } from "./ChamberDialog";
import { RemoveChamberDialog } from "./RemoveChamberDialog";
import styles from "./ChambersManager.module.css";

interface ChambersManagerProps {
  chambers: DoctorChamberDetail[];
  hospitals: Hospital[];
  onAddChamber: (values: ChamberFormValues) => Promise<boolean | void>;
  onEditChamber: (hospitalId: string, values: ChamberFormValues) => Promise<boolean | void>;
  onRemoveChamber: (hospitalId: string) => Promise<void>;
  isReadOnly?: boolean;
  isSaving?: boolean;
  catalogError?: string | null;
}

export function ChambersManager({
  chambers,
  hospitals,
  onAddChamber,
  onEditChamber,
  onRemoveChamber,
  isReadOnly = false,
  isSaving = false,
  catalogError,
}: ChambersManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChamber, setEditingChamber] = useState<DoctorChamberDetail | null>(null);

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [chamberToRemove, setChamberToRemove] = useState<DoctorChamberDetail | null>(null);

  const handleOpenAdd = () => {
    setEditingChamber(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (chamber: DoctorChamberDetail) => {
    setEditingChamber(chamber);
    setDialogOpen(true);
  };

  const handleOpenRemove = (chamber: DoctorChamberDetail) => {
    setChamberToRemove(chamber);
    setRemoveDialogOpen(true);
  };

  const handleSaveChamber = async (values: ChamberFormValues) => {
    if (editingChamber) {
      const hid = editingChamber.hospitalId || editingChamber.hospital?.id || "";
      return onEditChamber(hid, values);
    }
    return onAddChamber(values);
  };

  const handleConfirmRemove = async () => {
    if (!chamberToRemove) return;
    const hid = chamberToRemove.hospitalId || chamberToRemove.hospital?.id || "";
    await onRemoveChamber(hid);
    setChamberToRemove(null);
  };

  return (
    <section className={styles.section} aria-label="Hospital Chambers Management">
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>Practicing Chambers</h2>
          <p className={styles.subheading}>
            Manage physical hospital chambers where you provide in-person patient consultations.
          </p>
        </div>

        {!isReadOnly && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleOpenAdd}
            disabled={isSaving || hospitals.length === 0}
            aria-label="Add practicing chamber"
          >
            <Plus size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
            <span>Add Chamber</span>
          </Button>
        )}
      </div>

      {catalogError && <Alert kind="error">{catalogError}</Alert>}

      {chambers.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={36} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
          <h3 className={styles.emptyTitle}>No chambers added yet</h3>
          <p className={styles.emptyDescription}>
            Add a physical hospital location from the catalog to allow patients to book in-person
            consultations, or provide remote video consultations below.
          </p>
          {!isReadOnly && hospitals.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleOpenAdd}
              disabled={isSaving}
            >
              <Plus size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
              <span>Add Your First Chamber</span>
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.chambersList}>
          {chambers.map((chamber) => {
            const hospital = chamber.hospital ?? hospitals.find((h) => h.id === chamber.hospitalId);
            const hospitalName = hospital?.name ?? "Hospital Chamber";
            const hospitalArea = hospital?.area ?? "Dhaka";
            const hospitalAddress = hospital?.address ?? "";

            return (
              <div key={chamber.id ?? chamber.hospitalId} className={styles.chamberCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.hospitalTitleArea}>
                    <h3 className={styles.hospitalName}>
                      <Building2 size={16} aria-hidden="true" />
                      <span>{hospitalName}</span>
                    </h3>
                    <div className={styles.hospitalAddress}>
                      <MapPin size={12} aria-hidden="true" />
                      <span>
                        {hospitalArea}
                        {hospitalAddress ? ` · ${hospitalAddress}` : ""}
                      </span>
                    </div>
                  </div>

                  <Badge tone={chamber.isActive !== false ? "success" : "neutral"}>
                    {chamber.isActive !== false ? "Active Chamber" : "Inactive"}
                  </Badge>
                </div>

                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Room / Unit</span>
                    <span className={styles.detailValue}>
                      {chamber.roomOrUnit ? chamber.roomOrUnit : "Not specified"}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>In-Person Consultation Fee</span>
                    <span className={styles.detailValue}>
                      {formatMoney(chamber.consultationFee)}
                    </span>
                  </div>
                </div>

                {!isReadOnly && (
                  <div className={styles.cardActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(chamber)}
                      disabled={isSaving}
                      aria-label={`Edit chamber at ${hospitalName}`}
                    >
                      <Edit2 size={13} aria-hidden="true" style={{ marginRight: "4px" }} />
                      <span>Edit</span>
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenRemove(chamber)}
                      disabled={isSaving}
                      aria-label={`Remove chamber at ${hospitalName}`}
                    >
                      <Trash2 size={13} aria-hidden="true" style={{ marginRight: "4px" }} />
                      <span>Remove</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <ChamberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hospitals={hospitals}
        existingChambers={chambers}
        editingChamber={editingChamber}
        onSave={handleSaveChamber}
        isSaving={isSaving}
      />

      {/* Remove Confirmation Dialog */}
      <RemoveChamberDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        chamber={chamberToRemove}
        onConfirmRemove={handleConfirmRemove}
        isRemoving={isSaving}
      />
    </section>
  );
}
