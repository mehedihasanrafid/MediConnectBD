import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Plus, Search, Stethoscope, X } from "lucide-react";
import type { Specialty } from "../../../../shared/types";
import { Alert, Badge, Input } from "../../../../shared/ui";
import styles from "./SpecialtiesSelector.module.css";

interface SpecialtiesSelectorProps {
  specialties: Specialty[];
  selectedSpecialtyIds: string[];
  onToggleSpecialty: (id: string) => void;
  onRemoveSpecialty: (id: string) => void;
  isReadOnly?: boolean;
  catalogError?: string | null;
}

export function SpecialtiesSelector({
  specialties,
  selectedSpecialtyIds,
  onToggleSpecialty,
  onRemoveSpecialty,
  isReadOnly = false,
  catalogError,
}: SpecialtiesSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredSpecialties = useMemo(() => {
    if (!search.trim()) return specialties;
    const term = search.toLowerCase();
    return specialties.filter((s) => s.name.toLowerCase().includes(term));
  }, [search, specialties]);

  const selectedSpecialties = useMemo(() => {
    return selectedSpecialtyIds
      .map((id) => specialties.find((s) => s.id === id))
      .filter((s): s is Specialty => Boolean(s));
  }, [selectedSpecialtyIds, specialties]);

  const isLimitReached = selectedSpecialtyIds.length >= 10;

  return (
    <section className={styles.section} aria-label="Clinical Specialties Management">
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>Clinical Specialties</h2>
          <p className={styles.subheading}>
            Select the clinical domains you specialize in (up to 10 specialties).
          </p>
        </div>

        <Badge tone={selectedSpecialtyIds.length > 0 ? "primary" : "warning"}>
          {`${selectedSpecialtyIds.length} / 10 Selected`}
        </Badge>
      </div>

      {catalogError && <Alert kind="error">{catalogError}</Alert>}

      {/* Selected Chips */}
      <div className={styles.selectedArea}>
        {selectedSpecialties.length === 0 ? (
          <span className={styles.emptyChips}>
            No specialties selected yet. Please select at least one specialty from the catalog below.
          </span>
        ) : (
          <div className={styles.chipsList}>
            {selectedSpecialties.map((spec) => (
              <span key={spec.id} className={styles.chip}>
                <Stethoscope size={12} aria-hidden="true" />
                <span>{spec.name}</span>
                {!isReadOnly && (
                  <button
                    type="button"
                    className={styles.chipRemoveBtn}
                    onClick={() => onRemoveSpecialty(spec.id)}
                    aria-label={`Remove specialty ${spec.name}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Search & Selector Grid */}
      {!isReadOnly && (
        <>
          <div className={styles.searchRow}>
            <div style={{ position: "relative", width: "100%" }}>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search specialties (e.g. Cardiology, Pediatrics)..."
                aria-label="Search catalog specialties"
                style={{ paddingLeft: "32px" }}
              />
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-muted)",
                }}
                aria-hidden="true"
              />
            </div>
          </div>

          {isLimitReached && (
            <span className={styles.limitNotice}>
              Maximum limit of 10 specialties reached. Remove a specialty to add another.
            </span>
          )}

          <div
            className={styles.specialtyCatalogGrid}
            role="group"
            aria-label="Available Specialties Catalog"
          >
            {filteredSpecialties.length === 0 ? (
              <div
                style={{
                  padding: "var(--space-4)",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-xs)",
                  gridColumn: "1 / -1",
                  textAlign: "center",
                }}
              >
                No specialties match your search.
              </div>
            ) : (
              filteredSpecialties.map((spec) => {
                const isSelected = selectedSpecialtyIds.includes(spec.id);
                const canSelect = isSelected || !isLimitReached;

                return (
                  <button
                    key={spec.id}
                    type="button"
                    disabled={!canSelect}
                    className={clsx(
                      styles.catalogItem,
                      isSelected && styles.catalogItemSelected,
                    )}
                    onClick={() => onToggleSpecialty(spec.id)}
                    aria-pressed={isSelected}
                  >
                    <span>{spec.name}</span>
                    {isSelected ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      <Plus size={14} aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}
